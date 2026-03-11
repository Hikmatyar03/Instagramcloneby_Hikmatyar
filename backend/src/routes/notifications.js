const express = require('express');
const router = express.Router();
const NotificationService = require('../services/NotificationService');
const { authenticate } = require('../middleware/auth');

// GET /notifications
router.get('/', authenticate, async (req, res, next) => {
    try {
        const result = await NotificationService.getNotifications(req.user._id, req.query.cursor);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// GET /notifications/unread-count
router.get('/unread-count', authenticate, async (req, res, next) => {
    try {
        const count = await NotificationService.getUnreadCount(req.user._id);
        res.json({ success: true, data: { count } });
    } catch (e) { next(e); }
});

// PATCH /notifications/read-all
router.patch('/read-all', authenticate, async (req, res, next) => {
    try {
        await NotificationService.markAllRead(req.user._id);
        res.json({ success: true });
    } catch (e) { next(e); }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res, next) => {
    try {
        const n = await NotificationService.markRead(req.params.id, req.user._id);
        res.json({ success: true, data: n });
    } catch (e) { next(e); }
});

// DELETE /notifications/:id
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        await NotificationService.deleteNotification(req.params.id, req.user._id);
        res.status(204).end();
    } catch (e) { next(e); }
});

module.exports = router;
