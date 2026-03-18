# InstaClone — Instagram Clone
Full-stack social media platform built with Node.js + React.

## Tech Stack
- **Backend:** Node.js 20 + Express.js 5 + MongoDB 7 + Socket.IO 4
- **Frontend:** React 18 + Vite + Tailwind CSS + Zustand + React Query

## Quick Start

### 1. Install dependencies
```bash
npm run install:all   # installs both backend and frontend
```

### 2. Set up environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI, JWT secrets, etc.
```

### 3. Start MongoDB (must be running locally)
```bash
mongod
```

### 4. Run both servers
```bash
npm run dev
# Backend: http://localhost:5000
# Frontend: http://localhost:5173
```

## Project Structure
```
Instagram_by_Hikmtayar/
├── backend/
│   ├── src/
│   │   ├── models/         # 14 Mongoose schemas
│   │   ├── services/       # Business logic layer
│   │   ├── routes/         # Express API routes
│   │   ├── middleware/     # Auth, upload, validate, error
│   │   ├── socket/         # Socket.IO event handlers
│   │   └── server.js       # Express + Socket.IO entry point
│   ├── uploads/            # Media storage (gitignored)
│   └── .env                # Environment variables
└── frontend/
    └── src/
        ├── api/            # Axios client + Socket.IO
        ├── store/          # Zustand stores
        ├── pages/          # 13 page components
        ├── components/     # Reusable UI components
        └── hooks/          # Custom React hooks
```

## API Base URL
`http://localhost:5000/api/v1`

## Environment Variables
See `backend/.env.example` for all required variables.

## Production Deployment

### Backend on Render
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

Required environment variables:

```env
NODE_ENV=production
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_secret
JWT_REFRESH_SECRET=your_long_random_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_ORIGIN=https://your-frontend-domain.vercel.app
BCRYPT_ROUNDS=12
UPLOAD_DIR=./uploads
MAX_IMAGE_SIZE_MB=10
MAX_VIDEO_SIZE_MB=100
```

Notes:
- The backend now fails fast on Render if `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, or `FRONTEND_ORIGIN` are missing.
- Do not leave `JWT_SECRET` or `JWT_REFRESH_SECRET` as placeholder values.

### Frontend on Vercel
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Required environment variables:

```env
VITE_API_BASE_URL=https://your-render-backend.onrender.com/api/v1
VITE_SOCKET_URL=https://your-render-backend.onrender.com
```

See `frontend/.env.example` for a template.

## Deployed Auth Troubleshooting

### Signup returns `500` first, then `409`
This usually means the backend created the user in MongoDB but crashed before finishing auth. Check Render environment variables first:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `MONGO_URI`
- `FRONTEND_ORIGIN`

After fixing env vars, redeploy Render.

### Signup returns `409 Conflict`
This means the email or username already exists in MongoDB Atlas.

To remove a duplicate test account in Atlas:
1. Open MongoDB Atlas.
2. Go to `Database` -> `Browse Collections`.
3. Open the `users` collection.
4. Search by email or username.
5. Delete the duplicate document.

### Browser console shows `404 favicon`
This is a missing static asset and is separate from auth. A `favicon.svg` has been added to the frontend so a fresh Vercel deploy should remove this warning.

# Instgarm_clone_By_Me
This is instgram clone
