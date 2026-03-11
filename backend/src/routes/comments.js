const express = require('express');
const router = express.Router();
const CommentService = require('../services/CommentService');
const { authenticate } = require('../middleware/auth');

// DELETE /comments/:id
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        await CommentService.deleteComment(req.params.id, req.user._id);
        res.status(204).end();
    } catch (e) { next(e); }
});

// PATCH /comments/:id/pin
router.patch('/:id/pin', authenticate, async (req, res, next) => {
    try {
        const comment = await CommentService.pinComment(req.params.id, req.user._id);
        res.json({ success: true, data: comment });
    } catch (e) { next(e); }
});

// POST /comments/:id/replies
router.post('/:id/replies', authenticate, async (req, res, next) => {
    try {
        const reply = await CommentService.addReply(req.params.id, req.user._id, req.body.text);
        res.status(201).json({ success: true, data: reply });
    } catch (e) { next(e); }
});

// GET /comments/:id/replies
router.get('/:id/replies', authenticate, async (req, res, next) => {
    try {
        const result = await CommentService.getReplies(req.params.id, req.query.cursor);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// POST /comments/:id/like
router.post('/:id/like', authenticate, async (req, res, next) => {
    try {
        await CommentService.likeComment(req.params.id, req.user._id);
        res.json({ success: true });
    } catch (e) { next(e); }
});

// DELETE /comments/:id/like
router.delete('/:id/like', authenticate, async (req, res, next) => {
    try {
        await CommentService.unlikeComment(req.params.id, req.user._id);
        res.status(204).end();
    } catch (e) { next(e); }
});

module.exports = router;
