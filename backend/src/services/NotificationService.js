const Notification = require('../models/Notification');

class NotificationService {
    async create({ userId, fromUserId, type, postId, commentId, storyId }) {
        // Build human-readable message
        const messages = {
            like: 'liked your post.',
            comment: 'commented on your post.',
            reply: 'replied to your comment.',
            mention: 'mentioned you in a comment.',
            follow: 'started following you.',
            follow_request: 'requested to follow you.',
            follow_accept: 'accepted your follow request.',
            live_start: 'started a live video.',
            story_reaction: 'reacted to your story.',
            post_share: 'shared your post.',
            comment_like: 'liked your comment.',
        };

        return Notification.create({
            user_id: userId,
            from_user_id: fromUserId,
            type,
            post_id: postId,
            comment_id: commentId,
            story_id: storyId,
            message: messages[type] || '',
        });
    }

    async getNotifications(userId, cursor, limit = 20) {
        const query = { user_id: userId };
        if (cursor) query._id = { $lt: cursor };

        const notifications = await Notification.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate('from_user_id', 'username full_name avatar_url is_verified')
            .populate('post_id', 'media')
            .populate('story_id', 'media_url thumbnail_url');

        const hasMore = notifications.length > limit;
        if (hasMore) notifications.pop();

        return {
            notifications,
            next_cursor: hasMore ? notifications[notifications.length - 1]._id : null,
        };
    }

    async getUnreadCount(userId) {
        return Notification.countDocuments({ user_id: userId, is_read: false });
    }

    async markAllRead(userId) {
        return Notification.updateMany({ user_id: userId, is_read: false }, { $set: { is_read: true } });
    }

    async markRead(notifId, userId) {
        return Notification.findOneAndUpdate({ _id: notifId, user_id: userId }, { $set: { is_read: true } }, { new: true });
    }

    async deleteNotification(notifId, userId) {
        const n = await Notification.findOneAndDelete({ _id: notifId, user_id: userId });
        if (!n) { const err = new Error('Not found'); err.status = 404; throw err; }
        return { deleted: true };
    }
}

module.exports = new NotificationService();
