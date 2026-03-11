const express = require('express');
const router = express.Router();
const PostService = require('../services/PostService');
const FeedService = require('../services/FeedService');
const CommentService = require('../services/CommentService');
const NotificationService = require('../services/NotificationService');
const Post = require('../models/Post');
const { authenticate } = require('../middleware/auth');
const { uploadPostMedia } = require('../middleware/upload');
const { pushNotification } = require('../socket');

// GET /posts/feed
router.get('/feed', authenticate, async (req, res, next) => {
    try {
        const result = await FeedService.getHomeFeed(req.user._id, req.query.cursor, parseInt(req.query.limit) || 15);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// GET /posts/explore
router.get('/explore', authenticate, async (req, res, next) => {
    try {
        const result = await FeedService.getExploreFeed(req.user._id, req.query.cursor, parseInt(req.query.limit) || 60, req.query.type);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// POST /posts
router.post('/', authenticate, (req, res, next) => {
    uploadPostMedia(req, res, async (err) => {
        if (err) return next(err);
        try {
            const post = await PostService.createPost(req.user._id, req.body, req.files);
            res.status(201).json({ success: true, data: post });
        } catch (e) { next(e); }
    });
});

// GET /posts/:id
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const post = await PostService.getPost(req.params.id, req.user._id);
        res.json({ success: true, data: post });
    } catch (e) { next(e); }
});

// PATCH /posts/:id
router.patch('/:id', authenticate, async (req, res, next) => {
    try {
        const post = await PostService.editPost(req.params.id, req.user._id, req.body);
        res.json({ success: true, data: post });
    } catch (e) { next(e); }
});

// DELETE /posts/:id
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        await PostService.deletePost(req.params.id, req.user._id);
        res.status(204).end();
    } catch (e) { next(e); }
});

// POST /posts/:id/like
router.post('/:id/like', authenticate, async (req, res, next) => {
    try {
        const result = await PostService.likePost(req.params.id, req.user._id);
        res.json({ success: true, data: result });

        // Push notification (fire-and-forget, do NOT block response)
        const io = req.app.get('io');
        if (io) {
            Post.findById(req.params.id).select('user_id').then(post => {
                if (post && post.user_id.toString() !== req.user._id.toString()) {
                    NotificationService.create({
                        userId: post.user_id,
                        fromUserId: req.user._id,
                        type: 'like',
                        postId: req.params.id,
                    }).then(notif => {
                        if (notif) {
                            notif.populate('from_user_id', 'username avatar_url').then(populated => {
                                pushNotification(io, post.user_id, populated);
                            }).catch(() => { });
                        }
                    }).catch(() => { });
                }
            }).catch(() => { });
        }
    } catch (e) { next(e); }
});

// DELETE /posts/:id/like
router.delete('/:id/like', authenticate, async (req, res, next) => {
    try {
        await PostService.unlikePost(req.params.id, req.user._id);
        res.status(204).end();
    } catch (e) { next(e); }
});

// GET /posts/:id/likes
router.get('/:id/likes', authenticate, async (req, res, next) => {
    try {
        const result = await PostService.getPostLikes(req.params.id, req.query.cursor);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// POST /posts/:id/save
router.post('/:id/save', authenticate, async (req, res, next) => {
    try {
        const result = await PostService.savePost(req.params.id, req.user._id, req.body.collection_name);
        res.status(201).json({ success: true, data: result });
    } catch (e) { next(e); }
});

// DELETE /posts/:id/save
router.delete('/:id/save', authenticate, async (req, res, next) => {
    try {
        await PostService.unsavePost(req.params.id, req.user._id);
        res.status(204).end();
    } catch (e) { next(e); }
});

// PATCH /posts/:id/archive
router.patch('/:id/archive', authenticate, async (req, res, next) => {
    try {
        const post = await PostService.toggleArchive(req.params.id, req.user._id);
        res.json({ success: true, data: post });
    } catch (e) { next(e); }
});

// PATCH /posts/:id/disable-comments
router.patch('/:id/disable-comments', authenticate, async (req, res, next) => {
    try {
        const post = await PostService.toggleComments(req.params.id, req.user._id);
        res.json({ success: true, data: post });
    } catch (e) { next(e); }
});

// POST /posts/:id/comments
router.post('/:id/comments', authenticate, async (req, res, next) => {
    try {
        const comment = await CommentService.addComment(req.params.id, req.user._id, req.body.text);
        res.status(201).json({ success: true, data: comment });

        // Push notification (fire-and-forget)
        const io = req.app.get('io');
        if (io) {
            Post.findById(req.params.id).select('user_id').then(post => {
                if (post && post.user_id.toString() !== req.user._id.toString()) {
                    NotificationService.create({
                        userId: post.user_id,
                        fromUserId: req.user._id,
                        type: 'comment',
                        postId: req.params.id,
                        commentId: comment._id,
                    }).then(notif => {
                        if (notif) {
                            notif.populate('from_user_id', 'username avatar_url').then(populated => {
                                pushNotification(io, post.user_id, populated);
                            }).catch(() => { });
                        }
                    }).catch(() => { });
                }
            }).catch(() => { });
        }
    } catch (e) { next(e); }
});

// GET /posts/:id/comments
router.get('/:id/comments', authenticate, async (req, res, next) => {
    try {
        const result = await CommentService.getComments(req.params.id, req.query.cursor);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

module.exports = router;



