const express = require('express');
const { query } = require('express-validator');
const router = express.Router();
const UserService = require('../services/UserService');
const FeedService = require('../services/FeedService');
const FollowService = require('../services/FollowService');
const { authenticate } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const path = require('path');

// GET /users/search
router.get('/search', authenticate, async (req, res, next) => {
    try {
        const users = await UserService.searchUsers(req.query.q);
        res.json({ success: true, data: users });
    } catch (e) { next(e); }
});

// GET /users/suggested
router.get('/suggested', authenticate, async (req, res, next) => {
    try {
        const users = await UserService.getSuggestedUsers(req.user._id);
        res.json({ success: true, data: users });
    } catch (e) { next(e); }
});

// GET /users/me
router.get('/me', authenticate, async (req, res, next) => {
    try {
        res.json({ success: true, data: req.user });
    } catch (e) { next(e); }
});

// PATCH /users/me
router.patch('/me', authenticate, async (req, res, next) => {
    try {
        const user = await UserService.updateProfile(req.user._id, req.body);
        res.json({ success: true, data: user });
    } catch (e) { next(e); }
});

// POST /users/me/avatar
router.post('/me/avatar', authenticate, (req, res, next) => {
    uploadAvatar(req, res, async (err) => {
        if (err) return next(err);
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        try {
            const avatarUrl = `/uploads/avatars/${req.file.filename}`;
            const user = await UserService.updateAvatar(req.user._id, avatarUrl);
            res.json({ success: true, data: user });
        } catch (e) { next(e); }
    });
});

// DELETE /users/me/avatar
router.delete('/me/avatar', authenticate, async (req, res, next) => {
    try {
        const user = await UserService.deleteAvatar(req.user._id);
        res.json({ success: true, data: user });
    } catch (e) { next(e); }
});

// GET /users/me/saved
router.get('/me/saved', authenticate, async (req, res, next) => {
    try {
        const result = await FeedService.getSavedPosts(req.user._id, req.query.cursor, parseInt(req.query.limit) || 15);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// PATCH /users/me/notification-settings
router.patch('/me/notification-settings', authenticate, async (req, res, next) => {
    try {
        const user = await UserService.updateNotificationSettings(req.user._id, req.body);
        res.json({ success: true, data: user });
    } catch (e) { next(e); }
});

// GET /users/:username/follow-status
router.get('/:username/follow-status', authenticate, async (req, res, next) => {
    try {
        const status = await FollowService.getFollowStatus(req.user._id, req.params.username);
        res.json({ success: true, data: status });
    } catch (e) { next(e); }
});

// POST /users/:username/follow
router.post('/:username/follow', authenticate, async (req, res, next) => {
    try {
        const result = await FollowService.follow(req.user._id, req.params.username);
        res.status(201).json({ success: true, data: result });

        // Push notification via Socket.IO (FollowService already creates+returns the notif)
        const io = req.app.get('io');
        if (io && result.notification) {
            const { pushNotification } = require('../socket');
            result.notification.populate('from_user_id', 'username avatar_url').then(populated => {
                pushNotification(io, result.target_user_id, populated);
            }).catch(() => {});
        }
    } catch (e) { next(e); }
});

// DELETE /users/:username/follow
router.delete('/:username/follow', authenticate, async (req, res, next) => {
    try {
        await FollowService.unfollow(req.user._id, req.params.username);
        res.status(204).end();
    } catch (e) { next(e); }
});

// DELETE /users/:username/follow-request — withdraw a PENDING request you sent
router.delete('/:username/follow-request', authenticate, async (req, res, next) => {
    try {
        const result = await FollowService.withdrawFollowRequest(req.user._id, req.params.username);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});



// GET /users/:username/followers
router.get('/:username/followers', authenticate, async (req, res, next) => {
    try {
        const result = await UserService.getFollowers(req.params.username, req.query.cursor);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// GET /users/:username/following
router.get('/:username/following', authenticate, async (req, res, next) => {
    try {
        const result = await UserService.getFollowing(req.params.username, req.query.cursor);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// GET /users/:username/posts
router.get('/:username/posts', authenticate, async (req, res, next) => {
    try {
        const result = await UserService.getUserPosts(req.params.username, req.query.cursor, parseInt(req.query.limit) || 15);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// GET /users/:username/reels
router.get('/:username/reels', authenticate, async (req, res, next) => {
    try {
        const result = await UserService.getUserPosts(req.params.username, req.query.cursor, parseInt(req.query.limit) || 15, 'reel');
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// GET /users/:username
router.get('/:username', authenticate, async (req, res, next) => {
    try {
        const profile = await UserService.getProfile(req.params.username, req.user._id);
        res.json({ success: true, data: profile });
    } catch (e) { next(e); }
});

module.exports = router;
