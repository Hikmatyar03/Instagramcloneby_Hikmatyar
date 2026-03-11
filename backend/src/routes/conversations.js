const express = require('express');
const router = express.Router();
const MessageService = require('../services/MessageService');
const { authenticate } = require('../middleware/auth');
const Follow = require('../models/Follow');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// GET /conversations
router.get('/', authenticate, async (req, res, next) => {
    try {
        const convs = await MessageService.listConversations(req.user._id);
        res.json({ success: true, data: convs });
    } catch (e) { next(e); }
});

// POST /conversations
router.post('/', authenticate, async (req, res, next) => {
    try {
        const conv = await MessageService.getOrCreateDirect(req.user._id, req.body.participant_id);
        res.status(201).json({ success: true, data: conv });
    } catch (e) { next(e); }
});

// POST /conversations/group
router.post('/group', authenticate, async (req, res, next) => {
    try {
        const conv = await MessageService.createGroup(req.user._id, req.body);
        res.status(201).json({ success: true, data: conv });
    } catch (e) { next(e); }
});

// GET /conversations/:id
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const conv = await MessageService.getConversation(req.params.id, req.user._id);
        res.json({ success: true, data: conv });
    } catch (e) { next(e); }
});

// GET /conversations/:id/messages
router.get('/:id/messages', authenticate, async (req, res, next) => {
    try {
        const result = await MessageService.getMessages(req.params.id, req.user._id, req.query.before);
        res.json({ success: true, data: result });
    } catch (e) { next(e); }
});

// POST /conversations/:id/messages
router.post('/:id/messages', authenticate, async (req, res, next) => {
    try {
        const conv = await Conversation.findOne({ _id: req.params.id, participants: req.user._id });
        if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

        // ── One-Message Rule for direct conversations ──────────────────────────
        // If this is a direct conversation, find the other participant
        if (conv.type === 'direct') {
            const otherId = conv.participants.find(pid => pid.toString() !== req.user._id.toString());
            if (otherId) {
                // Does the OTHER user follow the sender (i.e., has the recipient accepted a follow)?
                const recipientFollowsSender = await Follow.exists({
                    follower_id: otherId,
                    following_id: req.user._id,
                    status: 'accepted',
                });

                if (!recipientFollowsSender) {
                    // Count messages already sent by this user in the conversation
                    const priorCount = await Message.countDocuments({
                        conversation_id: conv._id,
                        sender_id: req.user._id,
                    });
                    if (priorCount >= 1) {
                        return res.status(403).json({
                            success: false,
                            error: 'ONE_MSG_LIMIT',
                            message: 'You can send 1 message before they follow you back.',
                        });
                    }
                }
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        const msg = await MessageService.sendMessage(req.params.id, req.user._id, req.body);
        // Socket.IO emit happens in socket handler when online
        res.status(201).json({ success: true, data: msg });
    } catch (e) { next(e); }
});

// PATCH /conversations/:id/mute
router.patch('/:id/mute', authenticate, async (req, res, next) => {
    try {
        // Toggle mute logic
        const Conversation = require('../models/Conversation');
        const conv = await Conversation.findOne({ _id: req.params.id, participants: req.user._id });
        if (!conv) return res.status(404).json({ success: false, message: 'Not found' });

        const isMuted = conv.muted_by.includes(req.user._id);
        if (isMuted) {
            conv.muted_by = conv.muted_by.filter(id => id.toString() !== req.user._id.toString());
        } else {
            conv.muted_by.push(req.user._id);
        }
        await conv.save();
        res.json({ success: true, data: { muted: !isMuted } });
    } catch (e) { next(e); }
});

module.exports = router;
