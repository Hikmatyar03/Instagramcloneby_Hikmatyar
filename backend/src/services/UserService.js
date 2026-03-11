const User = require('../models/User');
const Follow = require('../models/Follow');
const Post = require('../models/Post');

class UserService {
    async getProfile(username, requestingUserId) {
        const user = await User.findOne({ username: username.toLowerCase(), is_active: true });
        if (!user) {
            const err = new Error('User not found');
            err.status = 404;
            throw err;
        }

        let isFollowing = false;
        let followStatus = null;
        if (requestingUserId && requestingUserId.toString() !== user._id.toString()) {
            const follow = await Follow.findOne({ follower_id: requestingUserId, following_id: user._id });
            isFollowing = follow?.status === 'accepted';
            followStatus = follow?.status || null;
        }

        const profile = user.toJSON();
        profile.is_following = isFollowing;
        profile.follow_status = followStatus;

        // For private accounts, hide sensitive data to non-followers
        if (user.is_private && !isFollowing && requestingUserId?.toString() !== user._id.toString()) {
            profile.is_private_and_not_following = true;
        }

        return profile;
    }

    async updateProfile(userId, updates) {
        const allowed = ['full_name', 'bio', 'website', 'gender'];
        const filtered = {};
        allowed.forEach(k => { if (updates[k] !== undefined) filtered[k] = updates[k]; });

        if (updates.is_private !== undefined) filtered.is_private = updates.is_private;

        return User.findByIdAndUpdate(userId, filtered, { new: true, runValidators: true });
    }

    async updateAvatar(userId, avatarUrl) {
        return User.findByIdAndUpdate(userId, { avatar_url: avatarUrl }, { new: true });
    }

    async deleteAvatar(userId) {
        return User.findByIdAndUpdate(userId, { avatar_url: '' }, { new: true });
    }

    async searchUsers(query, limit = 10) {
        if (!query || query.length < 2) return [];
        const regex = new RegExp(`^${query}`, 'i');
        return User.find({
            $or: [{ username: regex }, { full_name: regex }],
            is_active: true,
        }).limit(limit).select('username full_name avatar_url is_verified followers_count');
    }

    async getSuggestedUsers(userId, limit = 10) {
        // "Followers of your followings" algorithm
        const myFollowings = await Follow.find({ follower_id: userId, status: 'accepted' }).select('following_id');
        const followingIds = myFollowings.map(f => f.following_id);

        if (!followingIds.length) {
            return User.find({ _id: { $ne: userId }, is_active: true }).limit(limit).select('username full_name avatar_url is_verified');
        }

        const secondDegree = await Follow.aggregate([
            { $match: { follower_id: { $in: followingIds }, status: 'accepted' } },
            { $group: { _id: '$following_id', score: { $sum: 1 } } },
            { $match: { _id: { $nin: [...followingIds, userId] } } },
            { $sort: { score: -1 } },
            { $limit: limit },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $match: { 'user.is_active': true } },
            { $replaceRoot: { newRoot: { $mergeObjects: ['$user', { mutual_count: '$score' }] } } },
        ]);

        return secondDegree;
    }

    async getFollowers(username, cursor, limit = 20) {
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            const err = new Error('User not found');
            err.status = 404;
            throw err;
        }

        const query = { following_id: user._id, status: 'accepted' };
        if (cursor) query._id = { $lt: cursor };

        const follows = await Follow.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate('follower_id', 'username full_name avatar_url is_verified');

        const hasMore = follows.length > limit;
        if (hasMore) follows.pop();

        return { followers: follows.map(f => f.follower_id), next_cursor: hasMore ? follows[follows.length - 1]._id : null };
    }

    async getFollowing(username, cursor, limit = 20) {
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            const err = new Error('User not found');
            err.status = 404;
            throw err;
        }

        const query = { follower_id: user._id, status: 'accepted' };
        if (cursor) query._id = { $lt: cursor };

        const follows = await Follow.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate('following_id', 'username full_name avatar_url is_verified');

        const hasMore = follows.length > limit;
        if (hasMore) follows.pop();

        return { following: follows.map(f => f.following_id), next_cursor: hasMore ? follows[follows.length - 1]._id : null };
    }

    async updateNotificationSettings(userId, settings) {
        const updates = {};
        const keys = ['likes', 'comments', 'comment_likes', 'follows', 'follow_requests', 'mentions', 'live_videos', 'story_reactions', 'email_notifications'];
        keys.forEach(k => {
            if (settings[k] !== undefined) updates[`notification_settings.${k}`] = settings[k];
        });
        return User.findByIdAndUpdate(userId, updates, { new: true });
    }

    async getUserPosts(username, cursor, limit = 15, type = null) {
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            const err = new Error('User not found');
            err.status = 404;
            throw err;
        }

        const query = { user_id: user._id, is_deleted: false, is_archived: false };
        if (type) query.type = type;
        if (cursor) query._id = { $lt: cursor };

        const posts = await Post.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate('user_id', 'username full_name avatar_url is_verified');

        const hasMore = posts.length > limit;
        if (hasMore) posts.pop();

        return { posts, next_cursor: hasMore ? posts[posts.length - 1]._id : null };
    }
}

module.exports = new UserService();
