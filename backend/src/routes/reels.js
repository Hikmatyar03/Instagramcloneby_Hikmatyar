const express = require('express');
const router = express.Router();
const FeedService = require('../services/FeedService');
const PostService = require('../services/PostService');
const { authenticate } = require('../middleware/auth');
const { uploadReelMedia } = require('../middleware/upload');

// POST /reels — same as post but type forced to 'reel'
router.post('/', authenticate, (req, res, next) => {
    uploadReelMedia(req, res, async (err) => {
        if (err) return next(err);
        try {
            req.body.type = 'reel';
            const post = await PostService.createPost(req.user._id, req.body, req.files);
            res.status(201).json({ success: true, data: post });
        } catch (e) { next(e); }
    });
});

// GET /reels/feed
router.get('/feed', authenticate, async (req, res, next) => {
    try {
        const result = await FeedService.getReelsFeed(req.user._id, req.query.cursor);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// GET /reels/:id
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const reel = await PostService.getPost(req.params.id, req.user._id);
        res.json({ success: true, data: reel });
    } catch (e) { next(e); }
});

// DELETE /reels/:id
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        await PostService.deletePost(req.params.id, req.user._id);
        res.status(204).end();
    } catch (e) { next(e); }
});

module.exports = router;
