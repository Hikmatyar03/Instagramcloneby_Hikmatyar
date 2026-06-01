# Instagram Clone Codebase Study

Generated: 2026-06-01

This document stores a full local study of the project source, configuration, runtime flow, data model, API surface, frontend structure, deployment setup, tests, and current risks.

Scope covered:

- Root project files and package scripts.
- Backend source under `backend/src`.
- Frontend source under `frontend/src`.
- Environment examples, Dockerfiles, Vercel config, Tailwind/Vite config, ERD documentation, and README.
- Existing backend tests.

Scope intentionally excluded:

- `node_modules`, `.git`, `.omx`, `.playwright-mcp`, generated build output, and dependency lockfile internals.
- Binary media contents under `backend/uploads`; the file locations are noted, but image/video bytes are not reproduced.

## 1. Project Summary

This repository is a full-stack Instagram-style social media application.

High-level product capabilities:

- User registration, login, refresh-token auth, logout, password reset, email verification, and password change.
- Profile viewing/editing, avatars, private accounts, follow/unfollow, follow requests, and suggested users.
- Feed, explore, hashtags, search, posts, reels, stories, highlights, likes, saves, comments, replies, and shares.
- Direct messages, group conversations, media messages, unsend/delete/react behavior, and one-message request gating.
- Real-time notifications, messages, typing/read receipts, live stream rooms, live comments, and WebRTC signaling relay.
- Frontend SPA with protected routes, lazy-loaded pages, Zustand state, React Query data fetching, Tailwind styling, and Socket.IO client.

Main stack:

- Backend: Node.js 20, Express 5, MongoDB via Mongoose 8, Socket.IO 4, JWT, bcrypt, multer, Cloudinary, Helmet, CORS, rate limiting, node-cron.
- Frontend: React 18, Vite 6, Tailwind CSS, Zustand, React Query, Axios, Socket.IO client, Framer Motion, React Router, React Hook Form, Zod, React Icons.
- Deployment: Backend intended for Render or Node hosting; frontend intended for Vercel or static Nginx hosting. Dockerfiles exist for both backend and frontend.

## 2. Repository Snapshot

Current inspected repository facts:

- Total files returned by `rg --files`: 124.
- Backend source files under `backend/src`: 48.
- Frontend source files under `frontend/src`: 35.
- Application source line count for `backend/src` and `frontend/src`: about 7,597 lines.
- Committed media files under `backend/uploads`: 19 files.
- Existing dirty worktree before this document was created: `frontend/src/App.jsx` modified, `.omx/` untracked, `.playwright-mcp/` untracked.

Important root files:

| Path | Purpose |
| --- | --- |
| `package.json` | Root scripts for running/installing backend and frontend together. |
| `README.md` | Existing setup, deployment, and troubleshooting notes. |
| `vercel.json` | Root Vercel routing/build config targeting backend server and frontend dist. |
| `database_erd.md.resolved` | Existing visual ERD and explanation for MongoDB relationships. |
| `Instagram_Clone_Documentation.html` | Existing HTML documentation artifact. |
| `.gitignore` | Ignores dependencies, env files, dist, coverage, logs, system files. |

Root scripts:

| Script | Command | Meaning |
| --- | --- | --- |
| `npm run dev` | `concurrently "npm run dev --prefix backend" "npm run dev --prefix frontend"` | Runs backend and frontend dev servers together. |
| `npm run install:all` | `npm i --prefix backend && npm i --prefix frontend` | Installs app dependencies in both workspaces. |
| `npm run start:backend` | `npm run dev --prefix backend` | Starts backend dev server. |
| `npm run start:frontend` | `npm run dev --prefix frontend` | Starts frontend dev server. |

## 3. Application Architecture

The application follows this flow:

1. Browser renders the Vite React SPA.
2. React pages/components call helper objects in `frontend/src/api/client.js`.
3. Axios sends REST calls to `/api/v1/...` on the backend.
4. Express routes in `backend/src/routes` authenticate and validate requests.
5. Routes call service classes in `backend/src/services`.
6. Services read/write Mongoose models in `backend/src/models`.
7. Socket.IO handles real-time rooms for users, conversations, and live streams.
8. Media uploads are accepted with multer memory storage and uploaded to Cloudinary.

Key architecture choices:

- Backend has a route/service/model split. Most business logic lives in services, while routes handle HTTP shape and some socket notifications.
- Authentication uses short-lived access JWTs and refresh JWTs stored in an HTTP-only cookie.
- Frontend stores the access token in persisted Zustand state and also mirrors it to `localStorage`.
- Frontend Axios interceptors attach the access token and attempt `/auth/refresh` on eligible `401` responses.
- Pagination is cursor based, generally using `_id` or document IDs.
- Counts such as `likes_count`, `comments_count`, `followers_count`, `following_count`, and `posts_count` are denormalized on documents.
- Production media storage is Cloudinary. Local upload directories exist mostly for static fallback and committed demo fixtures.

## 4. Backend Overview

Backend workspace:

| Path | Purpose |
| --- | --- |
| `backend/package.json` | Backend dependencies and scripts. |
| `backend/src/server.js` | Express, Socket.IO, Mongo connection, route registration, cron, startup. |
| `backend/src/routes` | REST route handlers. |
| `backend/src/services` | Business logic and database workflows. |
| `backend/src/models` | Mongoose schemas. |
| `backend/src/middleware` | Auth, upload, validation, error handling. |
| `backend/src/socket/index.js` | Socket.IO authentication and event handlers. |
| `backend/src/__tests__` | Jest/Supertest backend tests. |
| `backend/.env.example` | Backend environment template. |
| `backend/Dockerfile` | Production container for backend. |
| `backend/uploads` | Committed demo/upload files and local static fallback. |

Backend scripts:

| Script | Command |
| --- | --- |
| `npm start` | `node src/server.js` |
| `npm run dev` | `nodemon src/server.js` |
| `npm test` | `jest --runInBand` |

Backend dependencies of note:

- Security/auth: `jsonwebtoken`, `bcryptjs`, `helmet`, `cors`, `express-rate-limit`, `cookie-parser`.
- Data: `mongoose`.
- Upload/media: `multer`, `cloudinary`, `sharp`, `fluent-ffmpeg`.
- Realtime: `socket.io`.
- Validation/errors: `express-validator`, centralized error middleware.
- Jobs/mail/utilities: `node-cron`, `nodemailer`, `sanitize-html`, `uuid`.

### 4.1 Backend Boot Flow

`backend/src/server.js` performs these steps:

1. Loads `.env` with `dotenv`.
2. Creates Express app and HTTP server.
3. Registers security middleware:
   - Helmet with cross-origin resource policy settings.
   - CORS for localhost, `FRONTEND_ORIGIN`, and Vercel wildcard domains.
   - Global rate limit of 300 requests per minute.
4. Registers JSON/urlencoded parsing and cookies.
5. Uses Morgan logging outside `NODE_ENV=test`.
6. Serves `/uploads` from `UPLOAD_DIR`.
7. Registers API route prefixes under `/api/v1`.
8. Adds `/health`.
9. Adds 404 and centralized error middleware.
10. Configures Socket.IO with the same origin strategy.
11. Connects MongoDB.
12. Schedules hourly expired-story cleanup.
13. Starts HTTP server on `PORT` or `5000`.

Production startup guard:

- In `NODE_ENV=production`, startup fails if `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, or `FRONTEND_ORIGIN` are missing or placeholder values.
- Production also verifies Cloudinary configuration and fails fast if it is missing.

### 4.2 Route Registration

All application API routes are mounted under `/api/v1`.

| Prefix | Route file | Domain |
| --- | --- | --- |
| `/auth` | `routes/auth.js` | Register, login, refresh, logout, password reset, email verify, password change. |
| `/users` | `routes/users.js` | Current user, profile, avatar, saved posts, settings, follow state, profile content. |
| `/posts` | `routes/posts.js` | Feed, explore, create/read/edit/delete posts, likes, saves, comments. |
| `/comments` | `routes/comments.js` | Delete/pin comments, replies, comment likes. |
| `/stories` | `routes/stories.js` | Story create/feed/read/delete/view/viewers/react/highlight. |
| `/highlights` | `routes/highlights.js` | Highlight list/create/delete. |
| `/reels` | `routes/reels.js` | Reel create/feed/read/delete. |
| `/live` | `routes/live.js` | Start, list active, fetch, and end live streams. |
| `/conversations` | `routes/conversations.js` | Conversation list/create/group/read/messages/media/mute. |
| `/messages` | `routes/messages.js` | Delete, unsend, react to messages. |
| `/notifications` | `routes/notifications.js` | Notification list, unread count, mark read, delete. |
| `/follow-requests` | `routes/followRequests.js` | List, accept, reject pending follow requests. |
| `/search` | `routes/search.js` | Search users/hashtags and hashtag posts. |
| `/hashtags` | `routes/search.js` | Same router reused for hashtag-specific endpoints. |
| `/share` | `routes/share.js` | Share a post/reel to a DM recipient. |

Health check:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Returns `{ status: "ok", timestamp }`. |

### 4.3 Auth API

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | No | Validates username/email/password, creates user, returns access token, sets refresh cookie. |
| `POST` | `/api/v1/auth/login` | No | Accepts email or username in `login`, returns access token, sets refresh cookie. |
| `POST` | `/api/v1/auth/refresh` | Refresh cookie | Rotates refresh token and returns a new access token. |
| `POST` | `/api/v1/auth/logout` | Access token | Blocklists refresh token if present and clears cookie. |
| `POST` | `/api/v1/auth/forgot-password` | No | Creates a 6-digit OTP hash if email exists; response avoids email enumeration. |
| `POST` | `/api/v1/auth/reset-password` | No | Resets password with valid email/OTP/new password. |
| `GET` | `/api/v1/auth/verify-email/:token` | No | Marks email verified when token matches. |
| `POST` | `/api/v1/auth/change-password` | Access token | Changes password after current password verification. |

Refresh cookie options:

- `httpOnly: true`.
- `secure: true` and `sameSite: "none"` in production.
- `secure: false` and `sameSite: "lax"` outside production.
- Path `/`.
- Max age 7 days.

### 4.4 User/Profile API

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/users/search?q=` | Yes | Prefix search by username/full name. |
| `GET` | `/api/v1/users/suggested` | Yes | Suggested users from second-degree follows or fallback active users. |
| `GET` | `/api/v1/users/me` | Yes | Returns authenticated user. |
| `PATCH` | `/api/v1/users/me` | Yes | Updates full name, bio, website, gender, and privacy flag. |
| `POST` | `/api/v1/users/me/avatar` | Yes | Uploads avatar to Cloudinary and stores URL/public id. |
| `DELETE` | `/api/v1/users/me/avatar` | Yes | Deletes Cloudinary resource if configured and clears avatar. |
| `GET` | `/api/v1/users/me/saved` | Yes | Cursor-paginated saved posts. |
| `PATCH` | `/api/v1/users/me/notification-settings` | Yes | Updates notification settings. |
| `GET` | `/api/v1/users/:username/follow-status` | Yes | Returns follow status and whether target follows requester. |
| `POST` | `/api/v1/users/:username/follow` | Yes | Follows public users or creates pending request for private users. |
| `DELETE` | `/api/v1/users/:username/follow` | Yes | Unfollows or removes pending follow. |
| `DELETE` | `/api/v1/users/:username/follow-request` | Yes | Withdraws a pending request sent by current user. |
| `GET` | `/api/v1/users/:username/followers` | Yes | Privacy-gated follower list. |
| `GET` | `/api/v1/users/:username/following` | Yes | Privacy-gated following list. |
| `GET` | `/api/v1/users/:username/posts` | Yes | Privacy-gated user posts. |
| `GET` | `/api/v1/users/:username/reels` | Yes | Privacy-gated user reels. |
| `GET` | `/api/v1/users/:username/tagged` | Yes | Privacy-gated tagged content route, but service currently filters with `type: "tagged"`. |
| `GET` | `/api/v1/users/:username` | Yes | Profile with `is_following` and `follow_status`. |

Privacy behavior:

- Private profile content is viewable only by owner or accepted followers.
- Private followers/following endpoints return `403 PRIVATE_ACCOUNT`.
- Private posts/reels/tagged endpoints return empty result sets instead of `403`.

### 4.5 Posts, Comments, Saves, Likes

Posts API:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/posts/feed` | Yes | Home feed from self and accepted followings. |
| `GET` | `/api/v1/posts/explore` | Yes | Engagement-scored explore feed from non-followed users. |
| `POST` | `/api/v1/posts` | Yes | Uploads up to 10 media files plus optional thumbnail. |
| `GET` | `/api/v1/posts/:id` | Yes | Fetches post and enriches `is_liked`/`is_saved`. |
| `PATCH` | `/api/v1/posts/:id` | Yes | Edits caption/location for owner. |
| `DELETE` | `/api/v1/posts/:id` | Yes | Soft deletes and attempts Cloudinary cleanup. |
| `POST` | `/api/v1/posts/:id/like` | Yes | Creates like, increments count, pushes notification. |
| `DELETE` | `/api/v1/posts/:id/like` | Yes | Deletes like and decrements count. |
| `GET` | `/api/v1/posts/:id/likes` | Yes | Cursor-paginated users who liked a post. |
| `POST` | `/api/v1/posts/:id/save` | Yes | Saves post into optional collection. |
| `DELETE` | `/api/v1/posts/:id/save` | Yes | Unsaves post. |
| `PATCH` | `/api/v1/posts/:id/archive` | Yes | Toggles archive for owner. |
| `PATCH` | `/api/v1/posts/:id/disable-comments` | Yes | Toggles comments disabled for owner. |
| `POST` | `/api/v1/posts/:id/comments` | Yes | Adds top-level comment and pushes notification. |
| `GET` | `/api/v1/posts/:id/comments` | Yes | Cursor-paginated top-level comments. |

Comments API:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `DELETE` | `/api/v1/comments/:id` | Yes | Soft deletes own comment or comment on own post. |
| `PATCH` | `/api/v1/comments/:id/pin` | Yes | Toggles pin for post owner. |
| `POST` | `/api/v1/comments/:id/replies` | Yes | Adds reply to top-level comment. |
| `GET` | `/api/v1/comments/:id/replies` | Yes | Gets replies in ascending order. |
| `POST` | `/api/v1/comments/:id/like` | Yes | Likes comment. |
| `DELETE` | `/api/v1/comments/:id/like` | Yes | Unlikes comment. |

Post service behavior:

- Extracts hashtags from `#tag` patterns, lowercases, deduplicates, limits to 30.
- Extracts mentions from `@username` patterns and resolves matching users.
- Uploads media buffers directly to Cloudinary.
- Derives video thumbnail URLs by inserting Cloudinary `so_0,w_600` transformation.
- Chooses post type from request type, media count, and first file mimetype.
- Updates `posts_count` on create/delete.
- Updates hashtag counters on create.
- Stores likes and saves in separate collections with unique compound indexes.

### 4.6 Stories and Highlights

Stories API:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/v1/stories` | Yes | Uploads single `file`, creates 24-hour story. |
| `GET` | `/api/v1/stories/feed` | Yes | Groups active stories by followed users and self. |
| `GET` | `/api/v1/stories/:id` | Yes | Fetches a story. |
| `DELETE` | `/api/v1/stories/:id` | Yes | Owner delete with Cloudinary cleanup. |
| `POST` | `/api/v1/stories/:id/view` | Yes | Adds viewer if not already present. |
| `GET` | `/api/v1/stories/:id/viewers` | Yes | Owner-only viewer list. |
| `POST` | `/api/v1/stories/:id/react` | Yes | Adds or replaces reaction emoji. |
| `POST` | `/api/v1/stories/:id/highlight` | Yes | Adds story to highlight. |

Highlights API:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/highlights/:userId` | Yes | Lists highlights by user id. |
| `POST` | `/api/v1/highlights` | Yes | Creates highlight. |
| `DELETE` | `/api/v1/highlights/:id` | Yes | Deletes highlight owned by current user. |

Story model has a TTL index on `expires_at`. Server cron also attempts cleanup, but its current cleanup targets `Post` documents with `type: "story"` even though stories are stored in the separate `Story` model.

### 4.7 Reels, Search, Hashtags, Share

Reels API:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/v1/reels` | Yes | Uploads single reel file and optional thumbnail, forces post type `reel`. |
| `GET` | `/api/v1/reels/feed` | Yes | Algorithmic reel feed. |
| `GET` | `/api/v1/reels/:id` | Yes | Fetches reel through `PostService.getPost`. |
| `DELETE` | `/api/v1/reels/:id` | Yes | Deletes reel through post deletion flow. |

Search/hashtag API:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/search?q=` | Yes | Searches users and hashtags. |
| `GET` | `/api/v1/search/trending` | Yes | Trending hashtags from last 48 hours. Also mounted under `/hashtags/trending`. |
| `GET` | `/api/v1/search/:tag/posts` | Yes | Posts for hashtag. Also mounted under `/hashtags/:tag/posts`. |
| `GET` | `/api/v1/search/:tag` | Yes | Hashtag detail. Also mounted under `/hashtags/:tag`. |

Share API:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/v1/share` | Yes | Body `{ postId, recipientId }`; creates/uses direct conversation, sends post-share message, pushes message/notification. |

### 4.8 Conversations and Messages

Conversations API:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/conversations` | Yes | Lists conversations for current user. |
| `POST` | `/api/v1/conversations` | Yes | Gets or creates direct conversation. |
| `POST` | `/api/v1/conversations/group` | Yes | Creates group with 2-32 participants. |
| `GET` | `/api/v1/conversations/:id` | Yes | Gets conversation if current user participates. |
| `GET` | `/api/v1/conversations/:id/messages` | Yes | Cursor-paginated messages before a cursor. |
| `POST` | `/api/v1/conversations/:id/messages` | Yes | Sends text/shared message with one-message rule for direct conversations. |
| `POST` | `/api/v1/conversations/:id/messages/media` | Yes | Uploads media to Cloudinary and creates media message. |
| `PATCH` | `/api/v1/conversations/:id/mute` | Yes | Toggles current user in `muted_by`. |

Messages API:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `DELETE` | `/api/v1/messages/:id` | Yes | Sender deletes message and media resource if configured. |
| `POST` | `/api/v1/messages/:id/unsend` | Yes | Sender can unsend within 10 minutes. |
| `POST` | `/api/v1/messages/:id/react` | Yes | Adds/replaces/removes reaction emoji. |

Messaging behavior:

- Direct conversations must have exactly 2 participants.
- Groups must have 2 to 32 participants.
- Direct messages include a one-message pre-follow gate: if the recipient does not follow the sender, sender can send only one prior message.
- Message deletion sets `is_deleted`; unsend sets `is_unsent`, clears content/media, and is hidden by message query.
- `last_message_id`, `last_message_at`, and `last_message_preview` are stored on conversations.

### 4.9 Live Streams

Live API:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/v1/live/start` | Yes | Ends existing live stream for user, creates new stream, returns RTC config. |
| `GET` | `/api/v1/live/active` | Yes | Active live streams from accepted followings. |
| `GET` | `/api/v1/live/:streamId` | Yes | Fetches stream. |
| `POST` | `/api/v1/live/:streamId/end` | Yes | Ends stream owned by current user. |

Live service behavior:

- Uses UUID for `stream_id`.
- Returns STUN config and optional TURN server config from env.
- Keeps last 100 comments.
- Tracks viewer count and peak viewer count, though the `$max` update currently sets `peak_viewer_count` to at least `1` rather than comparing against the current viewer count value.

### 4.10 Notifications and Follow Requests

Notifications API:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/notifications` | Yes | Cursor-paginated notifications. |
| `GET` | `/api/v1/notifications/unread-count` | Yes | Count unread notifications. |
| `PATCH` | `/api/v1/notifications/read-all` | Yes | Marks all unread as read. |
| `PATCH` | `/api/v1/notifications/:id/read` | Yes | Marks one notification as read. |
| `DELETE` | `/api/v1/notifications/:id` | Yes | Deletes one notification. |

Follow requests API:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/follow-requests` | Yes | Lists pending requests for current user. |
| `POST` | `/api/v1/follow-requests/:followId/accept` | Yes | Accepts pending request and increments counts. |
| `DELETE` | `/api/v1/follow-requests/:followId/reject` | Yes | Rejects pending request. |

Notification behavior:

- Notification messages are created by `NotificationService.create`.
- Post like/comment routes push notifications after responding.
- Follow route pushes follow or follow-request notifications.
- Share route sends share notifications to post owner.
- Notification model has a sparse unique index to reduce duplicate post notifications by `(user_id, from_user_id, type, post_id)`.

## 5. Backend Data Model

The codebase has 14 Mongoose model files.

| Model | File | Main fields and behavior |
| --- | --- | --- |
| `User` | `models/User.js` | Username/email/password hash, profile fields, counts, privacy/verification flags, settings, saved posts, close friends, blocked users, recent searches, refresh token hash, reset/verify tokens, avatar public id. JSON transform removes sensitive fields. Has `comparePassword`. |
| `Post` | `models/Post.js` | User id, type `photo/video/reel/carousel`, media array, caption, hashtags, mentions, location, counts, deleted/archived/comments-disabled flags, sharing flag, expiry/aspect ratio. Indexes by user/date, date, hashtags, type, deletion/archive state, expiry. |
| `Story` | `models/Story.js` | User id, media type/url/public id, thumbnail, hls, duration, caption, stickers, audience, viewers, reactions, highlight link, expiry. TTL index on `expires_at`. |
| `Highlight` | `models/Highlight.js` | User id, title, cover URL, story IDs. |
| `Comment` | `models/Comment.js` | Post id, user id, optional parent id, text, counts, mentions, pinned/deleted flags. |
| `Like` | `models/Like.js` | User id, target id, target type `post/comment/message`; unique compound index prevents duplicate likes. |
| `Save` | `models/Save.js` | User id, post id, optional collection name; unique user/post index. |
| `Follow` | `models/Follow.js` | Follower id, following id, status `accepted/pending`, accepted date; unique follower/following index. |
| `Hashtag` | `models/Hashtag.js` | Tag, post count, last used date; indexes for trending and count sorting. |
| `Conversation` | `models/Conversation.js` | Direct/group type, participants, admins, name/avatar, last message, unread counts, disappearing TTL, muted users, request fields. |
| `Message` | `models/Message.js` | Conversation id, sender id, type, content, media, shared post/story, reactions, reply link, read state, delete/unsend state, disappearance date. |
| `Notification` | `models/Notification.js` | Recipient, actor, type, post/comment/story references, message, read flag. |
| `LiveStream` | `models/LiveStream.js` | Stream id, user id, title, status, viewer counts, viewers, comments, co-host/replay references, start/end times. |
| `RefreshTokenBlocklist` | `models/RefreshTokenBlocklist.js` | Hashed token, user id, expiry. TTL index purges expired blocklist entries. |

Important relationships:

- User creates posts, stories, comments, likes, saves, follows, messages, notifications, live streams.
- Posts have comments, likes, saves, hashtags, mentions, media.
- Stories have viewers, reactions, optional highlight membership.
- Follows connect users and can be pending for private accounts.
- Conversations contain messages and participants.
- Notifications connect recipient and actor to post/comment/story/message-related activity.

The existing `database_erd.md.resolved` already contains a Mermaid ERD for presentation use.

## 6. Backend Services

| Service | File | Main responsibilities |
| --- | --- | --- |
| `AuthService` | `services/AuthService.js` | Register, login, refresh, logout, password reset, email verify, password change. Hashes passwords and refresh tokens. |
| `UserService` | `services/UserService.js` | Profiles, profile update, avatar update/delete, search, suggestions, followers/following, notification settings, user posts. |
| `FollowService` | `services/FollowService.js` | Follow/unfollow, follow status, follow requests, accept/reject, count updates, follow notifications. |
| `PostService` | `services/PostService.js` | Post/reel creation, media upload, hashtags/mentions, get/edit/delete, like/unlike, save/unsave, archive/comments toggles. |
| `FeedService` | `services/FeedService.js` | Home feed, explore feed, reels feed, saved posts. |
| `CommentService` | `services/CommentService.js` | Add comments/replies, list comments/replies, soft delete, pin, like/unlike comments. |
| `StoryService` | `services/StoryService.js` | Create story, story feed, story read/delete/view/viewers/react, highlights. |
| `MessageService` | `services/MessageService.js` | Direct/group conversation creation, list/get conversations, messages, send/delete/unsend/react/read. |
| `NotificationService` | `services/NotificationService.js` | Create/list/count/read/delete notifications. |
| `LiveService` | `services/LiveService.js` | Start/end/list/get live streams, comments, viewer count. |
| `CloudinaryService` | `services/CloudinaryService.js` | Configure/verify Cloudinary, upload buffer/file, delete resources, check config. |

## 7. Backend Middleware

| Middleware | File | Behavior |
| --- | --- | --- |
| `authenticate` | `middleware/auth.js` | Requires `Authorization: Bearer <token>`, verifies access JWT, loads active user, sets `req.user`. |
| `optionalAuth` | `middleware/auth.js` | Attaches user if a valid bearer token exists, otherwise continues. |
| Token helpers | `middleware/auth.js` | Generate access/refresh tokens and SHA-256 token hashes. |
| Upload middleware | `middleware/upload.js` | Multer memory storage for posts, reels, avatar, story, and message media with mimetype and size restrictions. |
| `validate` | `middleware/validate.js` | Converts express-validator errors into `422 VALIDATION_ERROR`. |
| `errorHandler` | `middleware/errorHandler.js` | Handles Multer, Mongoose validation, duplicate keys, JWT errors, and generic errors. |
| `notFound` | `middleware/errorHandler.js` | Returns `404 NOT_FOUND` for unmatched routes. |

Upload limits from env:

- `MAX_IMAGE_SIZE_MB`, default 10 MB.
- `MAX_VIDEO_SIZE_MB`, default 100 MB.
- `MAX_AVATAR_SIZE_MB`, default 5 MB even though it is not present in `.env.example`.

## 8. Socket.IO Realtime Layer

Socket setup lives in `backend/src/socket/index.js`.

Authentication:

- Socket middleware reads token from `socket.handshake.auth.token` or `socket.handshake.query.token`.
- Token is verified with `JWT_SECRET`.
- `socket.userId` is set from decoded JWT.

Rooms:

| Room | Purpose |
| --- | --- |
| `user:<userId>` | Personal room for targeted notifications. |
| `conversation:<conversationId>` | Chat room for direct/group messages and read/typing events. |
| `live:<streamId>` | Live stream room for viewer counts, comments, and WebRTC signaling. |

Tracked in memory:

- `onlineUsers`: `Map<userId, Set<socketId>>`.

Socket events:

| Event | Direction | Purpose |
| --- | --- | --- |
| `join_conversation` | client to server | Join conversation room. |
| `leave_conversation` | client to server | Leave conversation room. |
| `send_message` | client to server | Alternative socket path for text messages. |
| `new_message` | server to client | Broadcast a new message to a conversation room. |
| `typing_start` | client to server | Broadcast typing state. |
| `typing_stop` | client to server | Broadcast stopped typing state. |
| `user_typing` | server to client | Typing notification. |
| `user_stopped_typing` | server to client | Stopped typing notification. |
| `mark_read` | client to server | Mark messages read and broadcast read receipt. |
| `messages_read` | server to client | Read receipt. |
| `join_live` | client to server | Join live room and increment viewer count. |
| `leave_live` | client to server | Leave live room and decrement viewer count. |
| `viewer_count` | server to client | Broadcast live viewer count. |
| `live_offer` | client to server | Relay WebRTC offer. |
| `live_answer` | client to server | Relay WebRTC answer. |
| `live_ice_candidate` | client to server | Relay ICE candidate. |
| `live_comment` | both | Client sends live comment; server broadcasts saved comment. |
| `notification` | server to client | Push notification to personal room. |
| `ping` / `pong` | both | Simple connectivity check. |

Helper exports:

- `pushNotification(io, userId, notification)`.
- `pushMessage(io, conversationId, message)`.
- `onlineUsers`.

## 9. Frontend Overview

Frontend workspace:

| Path | Purpose |
| --- | --- |
| `frontend/package.json` | Frontend dependencies and scripts. |
| `frontend/src/main.jsx` | React root, QueryClientProvider, Toaster. |
| `frontend/src/App.jsx` | Router, protected routes, auth initialization, socket/notification bootstrapping. |
| `frontend/src/api` | Axios client, URL config, Socket.IO client. |
| `frontend/src/store` | Zustand auth, UI, notification, reel state. |
| `frontend/src/pages` | Page-level route components. |
| `frontend/src/components` | Layout, post, comment, story, user, search, skeleton components. |
| `frontend/src/hooks` | Custom hooks. |
| `frontend/src/utils` | Media URL and API error helpers. |
| `frontend/src/index.css` | Tailwind component classes and custom animations. |
| `frontend/vite.config.js` | Vite dev server and proxy setup. |
| `frontend/tailwind.config.js` | Tailwind theme/colors/animations. |
| `frontend/vercel.json` | SPA rewrite/security/cache headers. |
| `frontend/Dockerfile` | Multi-stage build served by Nginx. |
| `frontend/nginx.conf` | Static SPA Nginx config. |

Frontend scripts:

| Script | Command |
| --- | --- |
| `npm run dev` | `vite` |
| `npm run build` | `vite build` |
| `npm run preview` | `vite preview` |

### 9.1 Frontend Boot Flow

`frontend/src/main.jsx`:

- Creates a React Query `QueryClient`.
- Defaults query retry to 1, disables refetch on focus, and sets stale time to 60 seconds.
- Renders `<App />` inside `StrictMode` and `QueryClientProvider`.
- Registers `react-hot-toast` toaster with dark theme styling.

`frontend/src/App.jsx`:

- Uses `BrowserRouter`, `Routes`, and `ProtectedRoute`.
- Lazy-loads pages with `React.lazy`.
- Calls `initializeAuth()` on mount to validate persisted session.
- When authenticated, connects Socket.IO with the access token.
- Listens for `notification` socket event and increments unread count.
- Calls `userAPI.getMe()` to validate token and `notifAPI.getUnreadCount()` for badge state.
- Sends a keep-alive fetch to `${BACKEND_BASE_URL}/health` every 14 minutes while authenticated.

### 9.2 Frontend Routing

Public routes:

| Path | Component |
| --- | --- |
| `/` | `LoginPage`, or redirect to `/feed` if authenticated. |
| `/signup` | `SignupPage`, or redirect to `/feed` if authenticated. |

Protected routes inside `AppLayout`:

| Path | Component |
| --- | --- |
| `/feed` | `FeedPage` |
| `/explore` | `ExplorePage` |
| `/reels` | `ReelsFeedPage` |
| `/direct` | `DirectPage` |
| `/direct/:convId` | `DirectPage` |
| `/notifications` | `NotificationsPage` |
| `/settings` | `SettingsPage` |
| `/settings/:tab` | `SettingsPage` |
| `/p/:postId` | `PostDetailPage` |
| `/hashtag/:tag` | `HashtagPage` |
| `/:username` | `ProfilePage` |

Protected full-screen routes outside `AppLayout`:

| Path | Component |
| --- | --- |
| `/reel/:reelId` | `ReelPage` |
| `/stories/:userId/:storyId` | `StoryViewerPage` |
| `/live/:streamId` | `LivePage` |

Catch-all:

- `*` redirects to `/`.

### 9.3 Frontend API Layer

`frontend/src/api/config.js`:

- Default backend base URL is `https://instagramcloneby-hikmatyar.onrender.com`.
- `VITE_API_BASE_URL` or `VITE_SOCKET_URL` can override the backend URL.
- `API_BASE_URL` always ends with `/api/v1`.
- `BACKEND_BASE_URL` removes `/api/v1`.
- `SOCKET_URL` defaults to `BACKEND_BASE_URL`.

`frontend/src/api/client.js`:

- Axios instance uses `API_BASE_URL`, `withCredentials: true`, and 30-second timeout.
- Request interceptor reads `accessToken` from `localStorage` and sets `Authorization: Bearer ...`.
- Response interceptor handles `401` for non-auth endpoints by calling `/auth/refresh`.
- Concurrent refreshes are queued with `failedQueue`.
- On refresh failure, access token is removed and browser redirects to `/`.

API helper groups:

- `authAPI`: register, login, logout, forgot/reset/change password.
- `userAPI`: me, profile, avatar, saved, follow, settings, suggestions.
- `postAPI`: posts, feed, explore, like, save, comments.
- `storyAPI`: stories, viewers, reactions, highlights.
- `reelsAPI`: reels feed/detail/create.
- `messageAPI`: conversations, DMs, groups, messages, unsend, react.
- `notifAPI`: notifications and unread count.
- `searchAPI`: global search and hashtag pages.
- `liveAPI`: live stream lifecycle.
- `followRequestsAPI`: pending request list/accept/reject.
- `shareAPI`: share post/reel to DM.

`frontend/src/api/socket.js`:

- Creates singleton Socket.IO client with auth token.
- Enables reconnection with up to 10 attempts.
- Logs connect, disconnect, and connect_error events.
- Exports `connectSocket`, `disconnectSocket`, and `getSocket`.

### 9.4 Frontend State

`frontend/src/store/authStore.js`:

- Persisted Zustand store named `auth-storage`.
- State: `user`, `accessToken`, `isAuthenticated`.
- Actions: `setAuth`, `updateUser`, `refreshUser`, `initializeAuth`, `logout`.
- `setAuth` writes access token to `localStorage`, connects socket, and stores user/token/auth state.
- `logout` removes access token, disconnects socket, and clears auth state.

`frontend/src/store/uiStore.js`:

- `useNotifStore`: unread notification count and helpers.
- `useUIStore`: create modal open, search panel open, active nav.
- `useReelStore`: session-local `seenReelIds` set.

### 9.5 Frontend Pages and Components

Page inventory:

| Page | Main role |
| --- | --- |
| `LoginPage.jsx` | Login form with auth API and redirect to feed. |
| `SignupPage.jsx` | Signup form with auth API and redirect to feed. |
| `FeedPage.jsx` | Home feed using posts feed and stories feed. |
| `ExplorePage.jsx` | Explore grid/filter/search using explore and search APIs. |
| `ProfilePage.jsx` | Profile header, follow/message actions, tabs, privacy UI, posts/reels. |
| `PostDetailPage.jsx` | Post detail and comments. |
| `ReelsFeedPage.jsx` | Scrollable reels feed with video controls and like interactions. |
| `ReelPage.jsx` | Single reel full-screen view. |
| `DirectPage.jsx` | Conversation list, active message thread, socket room join/read/new message handling. |
| `NotificationsPage.jsx` | Notification feed and follow request accept/reject. |
| `StoryViewerPage.jsx` | Story progress, view tracking, owner delete/viewers, reactions. |
| `LivePage.jsx` | Live stream view, viewer count, comments, end action. |
| `HashtagPage.jsx` | Hashtag detail and hashtag post grid. |
| `SettingsPage.jsx` | Profile settings, avatar, privacy, password, notification settings. |

Component inventory:

| Component | Main role |
| --- | --- |
| `AppLayout.jsx` | Desktop sidebar, mobile bottom nav, create modal, search panel, logout. |
| `ProtectedRoute.jsx` | Redirects unauthenticated users to `/`. |
| `PostCard.jsx` | Feed card with media carousel/video, likes, saves, comments link, share, options. |
| `CreatePostModal.jsx` | Create post/reel/story/live entry UI. |
| `CommentItem.jsx` | Comment display and like behavior. |
| `StoriesRow.jsx` | Story bubbles and story viewer navigation. |
| `SearchPanel.jsx` | Search drawer/panel using debounced query. |
| `SuggestionsPanel.jsx` | Suggested user list and follow action. |
| `FollowListModal.jsx` | Followers/following modal with pagination and follow actions. |
| `PostCardSkeleton.jsx` | Loading skeleton for post cards. |

Utilities:

- `utils/media.js`: Converts Cloudinary/full URLs, relative `/uploads` paths, and legacy `/uploads/uploads` paths into usable URLs.
- `utils/apiErrors.js`: Normalizes backend/API errors into user-facing messages.
- `hooks/useDebounce.js`: Debounces a value with a timer.

### 9.6 Frontend Styling

Tailwind theme:

- Dark surface palette: `surface`, `surface.card`, `surface.border`, `surface.muted`, `surface.hover`.
- Text palette: `text.primary`, `text.secondary`, `text.muted`.
- Brand palette based on Instagram-like pink values.
- Custom animations: heart burst, fade in, slide up, story progress, pulse.

Global component classes in `index.css`:

- Buttons: `btn-gradient`, `btn-primary`, `btn-secondary`, `btn-ghost`.
- Inputs: `input-field`.
- Cards/surfaces: `glass`, `post-card`, `skeleton`.
- Navigation: `nav-icon`, `nav-icon.active`.
- Story and notification: `story-ring`, `story-ring-viewed`, `notif-dot`.
- Reel layout: `reel-container`, `reel-overlay`.
- Animations: `heart-pop`, `story-bar-animate`, `gradient-text`.

## 10. Environment Variables

Backend `.env.example`:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime mode. |
| `PORT` | Backend port, default 5000. |
| `MONGO_URI` | MongoDB connection string. |
| `JWT_SECRET` | Access-token signing secret. |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret. |
| `JWT_EXPIRES_IN` | Access-token lifetime, default 15m. |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime, default 7d. |
| `BCRYPT_ROUNDS` | Password hashing rounds, default 12. |
| `UPLOAD_DIR` | Static upload directory for local fallback. |
| `MAX_IMAGE_SIZE_MB` | Image upload limit. |
| `MAX_VIDEO_SIZE_MB` | Video upload limit. |
| `FRONTEND_ORIGIN` | Allowed frontend origin for CORS and Socket.IO. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Mail settings; code currently returns OTP but does not visibly send email in inspected service. |
| `TURN_SERVER_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` | Optional live stream TURN config. |
| `CLOUDINARY_URL` | Cloudinary single URL config. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary split config. |

Frontend `.env.example`:

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend API root, usually ending in `/api/v1` or backend origin. |
| `VITE_SOCKET_URL` | Socket.IO backend origin. |

Additional code-supported env not listed in backend example:

- `MAX_AVATAR_SIZE_MB`, defaulting to 5 MB in upload middleware.
- `MONGO_URI_TEST`, used by backend test setup if provided.

## 11. Deployment and Runtime

Local development:

1. Install backend and frontend dependencies with `npm run install:all`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Configure MongoDB and JWT secrets.
4. Start MongoDB locally or point `MONGO_URI` to Atlas.
5. Run `npm run dev`.
6. Backend runs at `http://localhost:5000`.
7. Frontend runs at `http://localhost:5173`.

Frontend dev server:

- Vite serves port `5173`.
- Proxies `/api`, `/socket.io`, and `/uploads` to `http://localhost:5000`.

Backend production:

- README recommends Render:
  - Root directory: `backend`.
  - Build command: `npm install`.
  - Start command: `npm start`.
- Required production env: `NODE_ENV`, `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_ORIGIN`, and Cloudinary config.
- Production startup intentionally fails fast if critical env vars are missing.

Frontend production:

- README recommends Vercel:
  - Root directory: `frontend`.
  - Build command: `npm run build`.
  - Output directory: `dist`.
  - Env: `VITE_API_BASE_URL`, `VITE_SOCKET_URL`.
- `frontend/vercel.json` rewrites all routes to `/index.html` and sets security/cache headers.

Docker:

- `backend/Dockerfile` uses `node:20-alpine`, installs native build tools, runs `npm ci --omit=dev`, exposes 5000, sets `NODE_ENV=production`, and starts `node src/server.js`.
- `frontend/Dockerfile` builds with Node 20 Alpine and serves `dist` via Nginx on port 8080.
- `frontend/nginx.conf` enables gzip, long-cache static assets, SPA fallback, and security headers.

Root Vercel:

- Root `vercel.json` builds `backend/src/server.js` with `@vercel/node` and routes `/api/(.*)` to backend.
- It also routes all other paths to `/frontend/dist/$1`.
- There is no root-level frontend build command in the root `package.json`, so separate frontend deployment is the clearer documented path.

## 12. Testing and Quality

Backend tests:

| File | Coverage |
| --- | --- |
| `backend/src/__tests__/setup.js` | Test env vars, test Mongo URI, cleanup after each test, drop DB after all tests. |
| `backend/src/__tests__/auth.test.js` | Register, duplicate email/username, password/username validation, login, refresh, logout, change password. |
| `backend/src/__tests__/posts.test.js` | Create post, auth rejection, get post, like, save, edit, delete, ownership rejection, add comment. |

Backend test assumptions:

- Tests use `MONGO_URI_TEST` or `mongodb://localhost:27017/instaclone_test`.
- `BCRYPT_ROUNDS` is reduced to 4.
- `NODE_ENV=test` skips Morgan and production env validation.
- Server is imported directly, so it connects to MongoDB on test import.

Frontend tests:

- No frontend test files or test scripts were found in `frontend/package.json`.

Lint/typecheck:

- No explicit lint script found.
- No TypeScript project found; frontend uses JavaScript/JSX.

Verification performed for this document:

- Repository file inventory inspected with `rg --files`.
- Core config/source files read directly.
- Route/API surface extracted from route definitions.
- Models/services/middleware/socket/frontend routing/state inspected.
- Document existence should be verified after creation.

## 13. Important Observations and Risks

These are not all necessarily bugs, but they are the main implementation risks visible from the study.

1. Production requires Cloudinary, but tests exercise post creation that calls `uploadBuffer`. Without Cloudinary test mocking/config, media-related tests may be brittle or fail in environments without valid Cloudinary credentials.
2. `Story` has a TTL index for expiry, but server cron cleanup deletes `Post` records where `type: "story"`. The current story implementation stores stories in the `Story` model, so the cron job appears stale.
3. `LiveService.updateViewerCount` uses `$max: { peak_viewer_count: 1 }` when viewers join. That does not update peak to the actual viewer count; it only guarantees at least 1.
4. `CommentItem.jsx` appears to use `postAPI.like(comment._id)` for comment likes in one branch, which maps to `/posts/:id/like`, while comment likes have their own `/comments/:id/like` endpoint.
5. `routes/conversations.js` media messages default `message_type` to `"media"`, but `Message` schema enum does not include `"media"`; valid values are `text`, `image`, `video`, `voice`, `post_share`, `story_share`, `reaction`.
6. `routes/users.js` tagged endpoint calls `UserService.getUserPosts(..., "tagged")`, but `Post.type` enum does not include `tagged`. This likely always returns empty or invalid semantic results.
7. `AuthService.forgotPassword` creates and returns an OTP internally, while route response says a reset code was sent. No actual `nodemailer` send call was found in the inspected service.
8. Frontend access token is stored in localStorage and persisted Zustand state. Refresh token is HTTP-only, but localStorage access tokens increase exposure to XSS compared with fully cookie-based access.
9. Several files contain non-ASCII box drawing comments and some output showed mojibake in the terminal, which indicates inconsistent encoding display or saved characters. This is mostly cosmetic but can make diffs noisy.
10. `backend/uploads` contains committed image/video fixture uploads even though `.gitignore` does not ignore `uploads/`. Production intends Cloudinary, so committed uploads may be legacy/demo artifacts.
11. Root deployment config and README deployment guidance are not fully aligned. README favors separate Render/Vercel deployment; root `vercel.json` implies combined deployment but does not define a root frontend build.
12. Backend has a centralized error handler, but some routes return direct response shapes with `message` and no `error` field; frontend error handling should account for both.

## 14. File Inventory

Root and docs/config:

```text
.gitignore
README.md
Instagram_Clone_Documentation.html
database_erd.md.resolved
package.json
package-lock.json
vercel.json
```

Backend source:

```text
backend/src/server.js
backend/src/socket/index.js
backend/src/middleware/auth.js
backend/src/middleware/errorHandler.js
backend/src/middleware/upload.js
backend/src/middleware/validate.js
backend/src/routes/auth.js
backend/src/routes/comments.js
backend/src/routes/conversations.js
backend/src/routes/followRequests.js
backend/src/routes/highlights.js
backend/src/routes/live.js
backend/src/routes/messages.js
backend/src/routes/notifications.js
backend/src/routes/posts.js
backend/src/routes/reels.js
backend/src/routes/search.js
backend/src/routes/share.js
backend/src/routes/stories.js
backend/src/routes/users.js
backend/src/services/AuthService.js
backend/src/services/CloudinaryService.js
backend/src/services/CommentService.js
backend/src/services/FeedService.js
backend/src/services/FollowService.js
backend/src/services/LiveService.js
backend/src/services/MessageService.js
backend/src/services/NotificationService.js
backend/src/services/PostService.js
backend/src/services/StoryService.js
backend/src/services/UserService.js
backend/src/models/Comment.js
backend/src/models/Conversation.js
backend/src/models/Follow.js
backend/src/models/Hashtag.js
backend/src/models/Highlight.js
backend/src/models/Like.js
backend/src/models/LiveStream.js
backend/src/models/Message.js
backend/src/models/Notification.js
backend/src/models/Post.js
backend/src/models/RefreshTokenBlocklist.js
backend/src/models/Save.js
backend/src/models/Story.js
backend/src/models/User.js
backend/src/__tests__/auth.test.js
backend/src/__tests__/posts.test.js
backend/src/__tests__/setup.js
```

Backend config/deploy:

```text
backend/package.json
backend/package-lock.json
backend/jest.config.js
backend/Dockerfile
backend/.env.example
```

Frontend source:

```text
frontend/src/main.jsx
frontend/src/App.jsx
frontend/src/index.css
frontend/src/api/client.js
frontend/src/api/config.js
frontend/src/api/socket.js
frontend/src/store/authStore.js
frontend/src/store/uiStore.js
frontend/src/hooks/useDebounce.js
frontend/src/utils/apiErrors.js
frontend/src/utils/media.js
frontend/src/pages/DirectPage.jsx
frontend/src/pages/ExplorePage.jsx
frontend/src/pages/FeedPage.jsx
frontend/src/pages/HashtagPage.jsx
frontend/src/pages/LivePage.jsx
frontend/src/pages/LoginPage.jsx
frontend/src/pages/NotificationsPage.jsx
frontend/src/pages/PostDetailPage.jsx
frontend/src/pages/ProfilePage.jsx
frontend/src/pages/ReelPage.jsx
frontend/src/pages/ReelsFeedPage.jsx
frontend/src/pages/SettingsPage.jsx
frontend/src/pages/SignupPage.jsx
frontend/src/pages/StoryViewerPage.jsx
frontend/src/components/comment/CommentItem.jsx
frontend/src/components/layout/AppLayout.jsx
frontend/src/components/layout/ProtectedRoute.jsx
frontend/src/components/post/CreatePostModal.jsx
frontend/src/components/post/PostCard.jsx
frontend/src/components/search/SearchPanel.jsx
frontend/src/components/skeletons/PostCardSkeleton.jsx
frontend/src/components/story/StoriesRow.jsx
frontend/src/components/user/FollowListModal.jsx
frontend/src/components/user/SuggestionsPanel.jsx
```

Frontend config/deploy/static:

```text
frontend/package.json
frontend/package-lock.json
frontend/index.html
frontend/vite.config.js
frontend/tailwind.config.js
frontend/postcss.config.js
frontend/vercel.json
frontend/Dockerfile
frontend/nginx.conf
frontend/.env.example
frontend/public/favicon.svg
```

Committed upload fixture paths:

```text
backend/uploads/avatars/*.jpg
backend/uploads/posts/*/*
backend/uploads/stories/*/*
```

## 15. Suggested Next Improvements

High-value follow-up work:

1. Add Cloudinary mocking or test-mode upload bypass for backend media tests.
2. Fix story cleanup cron to target the `Story` model or remove the redundant cron because TTL index already exists.
3. Fix message media type enum mismatch.
4. Fix comment like frontend API call.
5. Fix or redesign tagged-post support because `Post.type` does not support `tagged`.
6. Add frontend tests for auth, routing guards, post interactions, profile privacy, and direct messaging.
7. Add lint/format scripts and run them in CI.
8. Align deployment docs/config around either separate Render/Vercel deployment or a fully working combined deployment.

