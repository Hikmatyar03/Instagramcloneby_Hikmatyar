const express = require('express');
const router = express.Router();
const MessageService = require('../services/MessageService');
const { authenticate } = require('../middleware/auth');

// DELETE /messages/:id
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        await MessageService.deleteMessage(req.params.id, req.user._id);
        res.status(204).end();
    } catch (e) { next(e); }
});

// POST /messages/:id/unsend
router.post('/:id/unsend', authenticate, async (req, res, next) => {
    try {
        const msg = await MessageService.unsendMessage(req.params.id, req.user._id);
        res.json({ success: true, data: msg });
    } catch (e) { next(e); }
});

// POST /messages/:id/react
router.post('/:id/react', authenticate, async (req, res, next) => {
    try {
        const msg = await MessageService.reactToMessage(req.params.id, req.user._id, req.body.emoji);
        res.json({ success: true, data: msg });
    } catch (e) { next(e); }
});

module.exports = router;
