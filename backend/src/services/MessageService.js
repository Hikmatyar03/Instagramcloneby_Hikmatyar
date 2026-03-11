const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

class MessageService {
    async getOrCreateDirect(userId, participantId) {
        if (userId.toString() === participantId.toString()) {
            const err = new Error('Cannot message yourself');
            err.status = 400;
            throw err;
        }

        let conv = await Conversation.findOne({
            type: 'direct',
            participants: { $all: [userId, participantId], $size: 2 },
        }).populate('participants', 'username full_name avatar_url is_verified');

        if (!conv) {
            conv = await Conversation.create({ type: 'direct', participants: [userId, participantId] });
            await conv.populate('participants', 'username full_name avatar_url is_verified');
        }
        return conv;
    }

    async createGroup(userId, { name, participant_ids }) {
        const all = [userId, ...participant_ids.filter(id => id.toString() !== userId.toString())];
        if (all.length < 2 || all.length > 32) {
            const err = new Error('Group must have 2–32 participants');
            err.status = 400;
            throw err;
        }
        const conv = await Conversation.create({ type: 'group', participants: all, admins: [userId], name });
        return conv.populate('participants', 'username full_name avatar_url is_verified');
    }

    async listConversations(userId) {
        return Conversation.find({ participants: userId })
            .sort({ last_message_at: -1, created_at: -1 })
            .populate('participants', 'username full_name avatar_url is_verified')
            .populate('last_message_id');
    }

    async getConversation(convId, userId) {
        const conv = await Conversation.findOne({ _id: convId, participants: userId })
            .populate('participants', 'username full_name avatar_url is_verified');
        if (!conv) { const err = new Error('Not found'); err.status = 404; throw err; }
        return conv;
    }

    async getMessages(convId, userId, before, limit = 30) {
        const conv = await Conversation.findOne({ _id: convId, participants: userId });
        if (!conv) { const err = new Error('Not found'); err.status = 404; throw err; }

        const query = { conversation_id: convId, is_unsent: false };
        if (before) query._id = { $lt: before };

        const messages = await Message.find(query)
            .sort({ _id: -1 }).limit(limit + 1)
            .populate('sender_id', 'username full_name avatar_url')
            .populate('reply_to_id');

        const hasMore = messages.length > limit;
        if (hasMore) messages.pop();
        return { messages: messages.reverse(), next_cursor: hasMore ? messages[0]?._id : null };
    }

    async sendMessage(convId, senderId, { message_type, content, media_url, shared_post_id, reply_to_id }) {
        const conv = await Conversation.findOne({ _id: convId, participants: senderId });
        if (!conv) { const err = new Error('Not found'); err.status = 404; throw err; }

        const msg = await Message.create({
            conversation_id: convId,
            sender_id: senderId,
            message_type: message_type || 'text',
            content,
            media_url,
            shared_post_id,
            reply_to_id,
        });

        const preview = content ? content.slice(0, 100) : `[${message_type}]`;
        await Conversation.findByIdAndUpdate(convId, {
            last_message_id: msg._id,
            last_message_at: new Date(),
            last_message_preview: preview,
        });

        return msg.populate('sender_id', 'username full_name avatar_url');
    }

    async deleteMessage(msgId, userId) {
        const msg = await Message.findOne({ _id: msgId, sender_id: userId });
        if (!msg) { const err = new Error('Not found'); err.status = 404; throw err; }
        msg.is_deleted = true;
        return msg.save();
    }

    async unsendMessage(msgId, userId) {
        const msg = await Message.findOne({ _id: msgId, sender_id: userId });
        if (!msg) { const err = new Error('Not found'); err.status = 404; throw err; }
        const ageMins = (Date.now() - msg.created_at.getTime()) / 60000;
        if (ageMins > 10) { const err = new Error('Unsend window expired'); err.status = 400; throw err; }
        msg.is_unsent = true;
        msg.content = null;
        return msg.save();
    }

    async reactToMessage(msgId, userId, emoji) {
        const msg = await Message.findById(msgId);
        if (!msg) { const err = new Error('Not found'); err.status = 404; throw err; }
        msg.reactions = msg.reactions.filter(r => r.user_id.toString() !== userId.toString());
        if (emoji) msg.reactions.push({ user_id: userId, emoji });
        return msg.save();
    }

    async markRead(convId, userId) {
        await Message.updateMany(
            { conversation_id: convId, sender_id: { $ne: userId }, is_read: false },
            { $set: { is_read: true }, $push: { read_by: { user_id: userId, read_at: new Date() } } },
        );
    }
}

module.exports = new MessageService();
