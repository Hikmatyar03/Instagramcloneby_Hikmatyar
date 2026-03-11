const User = require('../models/User');
const Follow = require('../models/Follow');
const NotificationService = require('./NotificationService');

class FollowService {
    async follow(followerId, targetUsername) {
        const target = await User.findOne({ username: targetUsername.toLowerCase(), is_active: true });
        if (!target) {
            const err = new Error('User not found');
            err.status = 404;
            throw err;
        }

        if (followerId.toString() === target._id.toString()) {
            const err = new Error('Cannot follow yourself');
            err.status = 400;
            throw err;
        }

        const existing = await Follow.findOne({ follower_id: followerId, following_id: target._id });
        if (existing) {
            return { status: existing.status, message: 'Already following or request pending' };
        }

        const status = target.is_private ? 'pending' : 'accepted';
        await Follow.create({ follower_id: followerId, following_id: target._id, status });

        if (status === 'accepted') {
            await User.findByIdAndUpdate(followerId, { $inc: { following_count: 1 } });
            await User.findByIdAndUpdate(target._id, { $inc: { followers_count: 1 } });
        }

        // Return notification data so the route can push via Socket.IO
        const notifType = status === 'pending' ? 'follow_request' : 'follow';
        let notif = null;
        try {
            notif = await NotificationService.create({
                userId: target._id,
                fromUserId: followerId,
                type: notifType,
            });
        } catch { /* dedup — already notified */ }

        return { status, target_user_id: target._id, notification: notif };
    }

    async unfollow(followerId, targetUsername) {
        const target = await User.findOne({ username: targetUsername.toLowerCase() });
        if (!target) {
            const err = new Error('User not found');
            err.status = 404;
            throw err;
        }

        const follow = await Follow.findOneAndDelete({ follower_id: followerId, following_id: target._id });
        if (follow && follow.status === 'accepted') {
            await User.findByIdAndUpdate(followerId, { $inc: { following_count: -1 } });
            await User.findByIdAndUpdate(target._id, { $inc: { followers_count: -1 } });
        }

        return { unfollowed: !!follow };
    }

    async getFollowStatus(requesterId, targetUsername) {
        const target = await User.findOne({ username: targetUsername.toLowerCase() });
        if (!target) return { status: null };

        const follow = await Follow.findOne({ follower_id: requesterId, following_id: target._id });
        const reverseFollow = await Follow.findOne({ follower_id: target._id, following_id: requesterId, status: 'accepted' });

        return {
            status: follow?.status || null,
            follows_you: !!reverseFollow,
        };
    }

    async getFollowRequests(userId) {
        return Follow.find({ following_id: userId, status: 'pending' })
            .sort({ created_at: -1 })
            .populate('follower_id', 'username full_name avatar_url is_verified');
    }

    // Withdraw a pending follow request (the sender cancels it)
    async withdrawFollowRequest(followerId, targetUsername) {
        const target = await User.findOne({ username: targetUsername.toLowerCase() });
        if (!target) {
            const err = new Error('User not found');
            err.status = 404;
            throw err;
        }

        const follow = await Follow.findOneAndDelete({
            follower_id: followerId,
            following_id: target._id,
            status: 'pending',
        });

        return { withdrawn: !!follow };
    }

    async acceptFollowRequest(followId, userId) {
        const follow = await Follow.findOne({ _id: followId, following_id: userId, status: 'pending' });
        if (!follow) {
            const err = new Error('Follow request not found');
            err.status = 404;
            throw err;
        }

        follow.status = 'accepted';
        follow.accepted_at = new Date();
        await follow.save();

        await User.findByIdAndUpdate(follow.follower_id, { $inc: { following_count: 1 } });
        await User.findByIdAndUpdate(userId, { $inc: { followers_count: 1 } });

        return follow;
    }

    async rejectFollowRequest(followId, userId) {
        const follow = await Follow.findOneAndDelete({ _id: followId, following_id: userId, status: 'pending' });
        if (!follow) {
            const err = new Error('Follow request not found');
            err.status = 404;
            throw err;
        }
        return { rejected: true };
    }
}

module.exports = new FollowService();
