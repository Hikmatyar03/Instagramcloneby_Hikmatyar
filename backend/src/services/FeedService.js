const Post = require('../models/Post');
const Follow = require('../models/Follow');
const Like = require('../models/Like');
const Save = require('../models/Save');

class FeedService {
    /**
     * Home feed v1 — chronological with cursor pagination
     */
    async getHomeFeed(userId, cursor, limit = 15) {
        // Get IDs of followed users
        const followings = await Follow.find({ follower_id: userId, status: 'accepted' }).select('following_id');
        const followingIds = followings.map(f => f.following_id);

        const query = {
            user_id: { $in: [...followingIds, userId] },
            is_deleted: false,
            is_archived: false,
        };

        if (cursor) query._id = { $lt: cursor };

        const posts = await Post.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate('user_id', 'username full_name avatar_url is_verified is_private');

        const hasMore = posts.length > limit;
        if (hasMore) posts.pop();

        // Enrich with user interaction status
        const postIds = posts.map(p => p._id);
        const [likedSet, savedSet] = await Promise.all([
            Like.find({ user_id: userId, target_id: { $in: postIds }, target_type: 'post' }).select('target_id'),
            Save.find({ user_id: userId, post_id: { $in: postIds } }).select('post_id'),
        ]);

        const likedIds = new Set(likedSet.map(l => l.target_id.toString()));
        const savedIds = new Set(savedSet.map(s => s.post_id.toString()));

        const enriched = posts.map(p => ({
            ...p.toJSON(),
            is_liked: likedIds.has(p._id.toString()),
            is_saved: savedIds.has(p._id.toString()),
        }));

        return {
            posts: enriched,
            next_cursor: hasMore ? posts[posts.length - 1]._id : null,
        };
    }

    /**
     * Explore feed — engagement-scored posts from non-followed users
     */
    async getExploreFeed(userId, cursor, limit = 60, type = null) {
        const followings = await Follow.find({ follower_id: userId, status: 'accepted' }).select('following_id');
        const followingIds = followings.map(f => f.following_id);

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const pipeline = [
            {
                $match: {
                    user_id: { $nin: [...followingIds, userId] },
                    is_deleted: false,
                    is_archived: false,
                    created_at: { $gte: sevenDaysAgo },
                    ...(type ? { type } : {}),
                },
            },
            {
                $addFields: {
                    hours_since: { $divide: [{ $subtract: [new Date(), '$created_at'] }, 3600000] },
                    engagement: { $add: ['$likes_count', { $multiply: ['$comments_count', 2] }, { $multiply: ['$saves_count', 1.5] }] },
                },
            },
            {
                $addFields: {
                    explore_score: {
                        $divide: ['$engagement', { $pow: [{ $max: ['$hours_since', 1] }, 0.5] }],
                    },
                },
            },
            { $sort: { explore_score: -1 } },
            ...(cursor ? [{ $match: { _id: { $lt: cursor } } }] : []),
            { $limit: limit + 1 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user_id',
                    pipeline: [{ $project: { username: 1, full_name: 1, avatar_url: 1, is_verified: 1 } }],
                },
            },
            { $unwind: '$user_id' },
        ];

        const posts = await Post.aggregate(pipeline);

        const hasMore = posts.length > limit;
        if (hasMore) posts.pop();

        return {
            posts,
            next_cursor: hasMore ? posts[posts.length - 1]._id : null,
        };
    }

    /**
     * Reels feed — algorithmic
     */
    async getReelsFeed(userId, cursor, limit = 10) {
        const followings = await Follow.find({ follower_id: userId, status: 'accepted' }).select('following_id');
        const followingIds = followings.map(f => f.following_id);

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const pipeline = [
            {
                $match: {
                    type: 'reel',
                    is_deleted: false,
                    created_at: { $gte: sevenDaysAgo },
                    ...(cursor ? { _id: { $lt: cursor } } : {}),
                },
            },
            {
                $addFields: {
                    hours_since: { $divide: [{ $subtract: [new Date(), '$created_at'] }, 3600000] },
                    is_following: { $in: ['$user_id', followingIds] },
                },
            },
            {
                $addFields: {
                    reel_score: {
                        $divide: [
                            { $add: ['$likes_count', { $multiply: ['$comments_count', 2] }, { $multiply: ['$views_count', 0.05] }, { $multiply: ['$saves_count', 1.5] }] },
                            { $pow: [{ $max: ['$hours_since', 1] }, 0.3] },
                        ],
                    },
                },
            },
            { $sort: { reel_score: -1 } },
            { $limit: limit + 1 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user_id',
                    pipeline: [{ $project: { username: 1, full_name: 1, avatar_url: 1, is_verified: 1 } }],
                },
            },
            { $unwind: '$user_id' },
        ];

        const reels = await Post.aggregate(pipeline);

        const hasMore = reels.length > limit;
        if (hasMore) reels.pop();

        return {
            reels,
            next_cursor: hasMore ? reels[reels.length - 1]._id : null,
        };
    }

    async getSavedPosts(userId, cursor, limit = 15) {
        const query = { user_id: userId };
        if (cursor) query._id = { $lt: cursor };

        const saves = await Save.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate({
                path: 'post_id',
                match: { is_deleted: false },
                populate: { path: 'user_id', select: 'username full_name avatar_url is_verified' },
            });

        const hasMore = saves.length > limit;
        if (hasMore) saves.pop();

        const posts = saves.filter(s => s.post_id).map(s => s.post_id);
        return {
            posts,
            next_cursor: hasMore ? saves[saves.length - 1]._id : null,
        };
    }
}

module.exports = new FeedService();
