const express = require('express');
const router = express.Router();
const LiveService = require('../services/LiveService');
const { authenticate } = require('../middleware/auth');

// POST /live/start
router.post('/start', authenticate, async (req, res, next) => {
    try {
        const result = await LiveService.startStream(req.user._id, req.body);
        res.status(201).json({ success: true, data: result });
    } catch (e) { next(e); }
});

// GET /live/active
router.get('/active', authenticate, async (req, res, next) => {
    try {
        const streams = await LiveService.getActiveStreams(req.user._id);
        res.json({ success: true, data: streams });
    } catch (e) { next(e); }
});

// GET /live/:streamId
router.get('/:streamId', authenticate, async (req, res, next) => {
    try {
        const stream = await LiveService.getStream(req.params.streamId);
        res.json({ success: true, data: stream });
    } catch (e) { next(e); }
});

// POST /live/:streamId/end
router.post('/:streamId/end', authenticate, async (req, res, next) => {
    try {
        const stream = await LiveService.endStream(req.params.streamId, req.user._id);
        res.json({ success: true, data: stream });
    } catch (e) { next(e); }
});

module.exports = router;
