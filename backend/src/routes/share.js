const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Post = require('../models/Post');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { pushMessage } = require('../socket');
const NotificationService = require('../services/NotificationService');
const { pushNotification } = require('../socket');

/**
 * POST /api/v1/share
 * Share a post or reel as a DM to a recipient.
 * Body: { postId, recipientId }
 */
router.post('/', authenticate, async (req, res, next) => {
    try {
        const { postId, recipientId } = req.body;
        const senderId = req.user._id;

        if (!postId || !recipientId) {
            return res.status(400).json({ success: false, message: 'postId and recipientId are required.' });
        }

        // Cannot share to yourself
        if (recipientId === senderId.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot share to yourself.' });
        }

        const post = await Post.findById(postId).select('media type allow_sharing user_id');
        if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
        if (!post.allow_sharing) return res.status(403).json({ success: false, message: 'This post cannot be shared.' });

        // Find or create the direct conversation
        let conv = await Conversation.findOne({
            type: 'direct',
            participants: { $all: [senderId, recipientId] },
        });

        if (!conv) {
            conv = await Conversation.create({
                type: 'direct',
                participants: [senderId, recipientId],
                request_accepted: true,   // share always opens request
                request_sender: senderId,
            });
        }

        const mediaUrl = post.media?.[0]?.full_url || post.media?.[0]?.original_url || null;
        const msgType = post.type === 'reel' ? 'post_share' : 'post_share';

        const message = await Message.create({
            conversation_id: conv._id,
            sender_id: senderId,
            message_type: msgType,
            content: '',
            media_url: mediaUrl,
            shared_post_id: postId,
        });

        // Update conversation last-message
        await Conversation.findByIdAndUpdate(conv._id, {
            last_message_id: message._id,
            last_message_at: new Date(),
            last_message_preview: '📷 Sent a post',
        });

        // Push real-time message to conversation room
        const io = req.app.get('io');
        if (io) pushMessage(io, conv._id, message);

        // Send share notification to post owner (if not already the sender)
        if (post.user_id.toString() !== senderId.toString()) {
            try {
                const notif = await NotificationService.create({
                    userId: post.user_id,
                    fromUserId: senderId,
                    type: 'share',
                    postId,
                });
                if (io) pushNotification(io, post.user_id, notif);
            } catch { /* ignore duplicate */ }
        }

        res.status(201).json({ success: true, data: { conversationId: conv._id } });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
