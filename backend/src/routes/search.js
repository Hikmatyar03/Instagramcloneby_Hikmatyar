const express = require('express');
const router = express.Router();
const UserService = require('../services/UserService');
const Hashtag = require('../models/Hashtag');
const Post = require('../models/Post');
const { authenticate } = require('../middleware/auth');

// GET /search?q=
router.get('/', authenticate, async (req, res, next) => {
    try {
        const q = req.query.q || '';
        const [users, hashtags] = await Promise.all([
            UserService.searchUsers(q, 8),
            q.length >= 2
                ? Hashtag.find({ tag: { $regex: `^${q}`, $options: 'i' } }).limit(5).sort({ posts_count: -1 })
                : [],
        ]);
        res.json({ success: true, data: { users, hashtags } });
    } catch (e) { next(e); }
});

// GET /hashtags/trending
router.get('/trending', authenticate, async (req, res, next) => {
    try {
        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const trending = await Hashtag.find({ last_used_at: { $gte: twoDaysAgo } })
            .sort({ posts_count: -1 })
            .limit(10);
        res.json({ success: true, data: trending });
    } catch (e) { next(e); }
});

// GET /hashtags/:tag/posts
router.get('/:tag/posts', authenticate, async (req, res, next) => {
    try {
        const tag = req.params.tag.toLowerCase();
        const query = { hashtags: tag, is_deleted: false, is_archived: false };
        if (req.query.cursor) query._id = { $lt: req.query.cursor };

        const posts = await Post.find(query)
            .sort({ _id: -1 })
            .limit(31)
            .populate('user_id', 'username full_name avatar_url is_verified');

        const hasMore = posts.length > 30;
        if (hasMore) posts.pop();

        res.json({ success: true, data: { posts, next_cursor: hasMore ? posts[posts.length - 1]._id : null } });
    } catch (e) { next(e); }
});

// GET /hashtags/:tag
router.get('/:tag', authenticate, async (req, res, next) => {
    try {
        const hashtag = await Hashtag.findOne({ tag: req.params.tag.toLowerCase() });
        if (!hashtag) return res.status(404).json({ success: false, message: 'Hashtag not found' });
        res.json({ success: true, data: hashtag });
    } catch (e) { next(e); }
});

module.exports = router;
