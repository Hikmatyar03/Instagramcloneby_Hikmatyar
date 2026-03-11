const express = require('express');
const router = express.Router();
const StoryService = require('../services/StoryService');
const { authenticate } = require('../middleware/auth');
const { uploadStory } = require('../middleware/upload');

// POST /stories
router.post('/', authenticate, (req, res, next) => {
    uploadStory(req, res, async (err) => {
        if (err) return next(err);
        try {
            const story = await StoryService.createStory(req.user._id, req.body, req.file);
            res.status(201).json({ success: true, data: story });
        } catch (e) { next(e); }
    });
});

// GET /stories/feed
router.get('/feed', authenticate, async (req, res, next) => {
    try {
        const stories = await StoryService.getStoryFeed(req.user._id);
        res.json({ success: true, data: stories });
    } catch (e) { next(e); }
});

// GET /stories/:id
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const story = await StoryService.getStory(req.params.id);
        res.json({ success: true, data: story });
    } catch (e) { next(e); }
});

// DELETE /stories/:id
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        await StoryService.deleteStory(req.params.id, req.user._id);
        res.status(204).end();
    } catch (e) { next(e); }
});

// POST /stories/:id/view
router.post('/:id/view', authenticate, async (req, res, next) => {
    try {
        const result = await StoryService.viewStory(req.params.id, req.user._id);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// GET /stories/:id/viewers
router.get('/:id/viewers', authenticate, async (req, res, next) => {
    try {
        const viewers = await StoryService.getViewers(req.params.id, req.user._id);
        res.json({ success: true, data: viewers });
    } catch (e) { next(e); }
});

// POST /stories/:id/react
router.post('/:id/react', authenticate, async (req, res, next) => {
    try {
        const result = await StoryService.addReaction(req.params.id, req.user._id, req.body.emoji);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// POST /stories/:id/highlight
router.post('/:id/highlight', authenticate, async (req, res, next) => {
    try {
        const result = await StoryService.addToHighlight(req.params.id, req.body.highlight_id, req.user._id);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

module.exports = router;
