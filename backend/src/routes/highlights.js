const express = require('express');
const router = express.Router();
const StoryService = require('../services/StoryService');
const { authenticate } = require('../middleware/auth');

// GET /highlights/:userId
router.get('/:userId', authenticate, async (req, res, next) => {
    try {
        const highlights = await StoryService.getUserHighlights(req.params.userId);
        res.json({ success: true, data: highlights });
    } catch (e) { next(e); }
});

// POST /highlights
router.post('/', authenticate, async (req, res, next) => {
    try {
        const highlight = await StoryService.createHighlight(req.user._id, req.body);
        res.status(201).json({ success: true, data: highlight });
    } catch (e) { next(e); }
});

// DELETE /highlights/:id
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        await StoryService.deleteHighlight(req.params.id, req.user._id);
        res.status(204).end();
    } catch (e) { next(e); }
});

module.exports = router;
