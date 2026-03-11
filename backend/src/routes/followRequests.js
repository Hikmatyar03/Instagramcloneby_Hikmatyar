const express = require('express');
const router = express.Router();
const MessageService = require('../services/MessageService');
const FollowService = require('../services/FollowService');
const { authenticate } = require('../middleware/auth');

// GET /follow-requests
router.get('/', authenticate, async (req, res, next) => {
    try {
        const requests = await FollowService.getFollowRequests(req.user._id);
        res.json({ success: true, data: requests });
    } catch (e) { next(e); }
});

// POST /follow-requests/:followId/accept
router.post('/:followId/accept', authenticate, async (req, res, next) => {
    try {
        const result = await FollowService.acceptFollowRequest(req.params.followId, req.user._id);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// DELETE /follow-requests/:followId/reject
router.delete('/:followId/reject', authenticate, async (req, res, next) => {
    try {
        await FollowService.rejectFollowRequest(req.params.followId, req.user._id);
        res.status(204).end();
    } catch (e) { next(e); }
});

module.exports = router;
