const Story = require('../models/Story');
const Highlight = require('../models/Highlight');
const Follow = require('../models/Follow');
const path = require('path');

class StoryService {
    async createStory(userId, { caption, audience, stickers }, file) {
        if (!file) {
            const err = new Error('Media file is required');
            err.status = 400;
            throw err;
        }

        const isVideo = file.mimetype.startsWith('video/');
        // path.relative gives e.g. 'uploads/stories/userId/file.ext'
        const relativePart = path.relative(path.join(__dirname, '../../'), file.path).replace(/\\/g, '/');
        const fileUrl = `/${relativePart}`;

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const story = await Story.create({
            user_id: userId,
            media_type: isVideo ? 'video' : 'image',
            media_url: fileUrl,
            thumbnail_url: fileUrl,
            duration: isVideo ? 15 : 5,
            caption,
            audience: audience || 'followers',
            stickers: stickers ? JSON.parse(stickers) : [],
            expires_at: expiresAt,
        });

        return story.populate('user_id', 'username full_name avatar_url is_verified');
    }

    async getStoryFeed(userId) {
        // Get followings
        const followings = await Follow.find({ follower_id: userId, status: 'accepted' }).select('following_id');
        const followingIds = followings.map(f => f.following_id);

        const now = new Date();

        // Group stories by user
        const stories = await Story.aggregate([
            {
                $match: {
                    user_id: { $in: [...followingIds, userId] },
                    expires_at: { $gt: now },
                    $or: [
                        { audience: 'public' },
                        { audience: 'followers' },
                    ],
                },
            },
            { $sort: { created_at: 1 } },
            {
                $group: {
                    _id: '$user_id',
                    stories: { $push: '$$ROOT' },
                    latest_at: { $last: '$created_at' },
                    has_unviewed: {
                        $push: {
                            $cond: [{ $in: [userId, '$viewers.user_id'] }, 0, 1],
                        },
                    },
                },
            },
            { $sort: { latest_at: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                    pipeline: [{ $project: { username: 1, full_name: 1, avatar_url: 1, is_verified: 1 } }],
                },
            },
            { $unwind: '$user' },
        ]);

        return stories;
    }

    async getStory(storyId) {
        const story = await Story.findById(storyId)
            .populate('user_id', 'username full_name avatar_url is_verified');
        if (!story) {
            const err = new Error('Story not found');
            err.status = 404;
            throw err;
        }
        return story;
    }

    async deleteStory(storyId, userId) {
        const story = await Story.findOne({ _id: storyId, user_id: userId });
        if (!story) {
            const err = new Error('Story not found');
            err.status = 404;
            throw err;
        }
        await story.deleteOne();
        return { deleted: true };
    }

    async viewStory(storyId, userId) {
        const story = await Story.findById(storyId);
        if (!story) return;

        // Add viewer if not already present
        const alreadyViewed = story.viewers.some(v => v.user_id.toString() === userId.toString());
        if (!alreadyViewed) {
            story.viewers.push({ user_id: userId, viewed_at: new Date() });
            await story.save();
        }

        return { view_count: story.viewers.length };
    }

    async getViewers(storyId, userId) {
        const story = await Story.findOne({ _id: storyId, user_id: userId });
        if (!story) {
            const err = new Error('Story not found');
            err.status = 404;
            throw err;
        }
        return story.viewers;
    }

    async addReaction(storyId, userId, emoji) {
        const story = await Story.findById(storyId);
        if (!story) {
            const err = new Error('Story not found');
            err.status = 404;
            throw err;
        }

        story.reactions = story.reactions.filter(r => r.user_id.toString() !== userId.toString());
        story.reactions.push({ user_id: userId, emoji, reacted_at: new Date() });
        await story.save();
        return { emoji };
    }

    async addToHighlight(storyId, highlightId, userId) {
        const [story, highlight] = await Promise.all([
            Story.findById(storyId),
            Highlight.findOne({ _id: highlightId, user_id: userId }),
        ]);

        if (!story || !highlight) {
            const err = new Error('Not found');
            err.status = 404;
            throw err;
        }

        if (!highlight.story_ids.includes(storyId)) {
            highlight.story_ids.push(storyId);
            await highlight.save();
        }

        story.is_highlight = true;
        story.highlight_id = highlightId;
        await story.save();

        return highlight;
    }

    async createHighlight(userId, { title, cover_story_id }) {
        let cover_url;
        if (cover_story_id) {
            const story = await Story.findById(cover_story_id);
            cover_url = story?.thumbnail_url;
        }

        return Highlight.create({ user_id: userId, title, cover_url, story_ids: cover_story_id ? [cover_story_id] : [] });
    }

    async getUserHighlights(userId) {
        return Highlight.find({ user_id: userId }).sort({ created_at: -1 });
    }

    async deleteHighlight(highlightId, userId) {
        const hl = await Highlight.findOneAndDelete({ _id: highlightId, user_id: userId });
        if (!hl) {
            const err = new Error('Highlight not found');
            err.status = 404;
            throw err;
        }
        return { deleted: true };
    }
}

module.exports = new StoryService();
