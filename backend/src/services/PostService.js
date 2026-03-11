const Post = require('../models/Post');
const Hashtag = require('../models/Hashtag');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Like = require('../models/Like');
const Save = require('../models/Save');
const path = require('path');
const fs = require('fs');

// Extract hashtags from caption
const extractHashtags = (caption) => {
    if (!caption) return [];
    const matches = caption.match(/#[a-zA-Z0-9_]+/g) || [];
    return [...new Set(matches.map(h => h.slice(1).toLowerCase()))].slice(0, 30);
};

// Extract mentions from caption
const extractMentions = (caption) => {
    if (!caption) return [];
    const matches = caption.match(/@([a-zA-Z0-9_]+)/g) || [];
    return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
};

class PostService {
    async createPost(userId, { caption, location, type }, files) {
        // Parse hashtags and mentions
        const hashtags = extractHashtags(caption);
        const mentionUsernames = extractMentions(caption);

        // Resolve mention user IDs
        let mentions = [];
        if (mentionUsernames.length) {
            const users = await User.find({ username: { $in: mentionUsernames } }).select('_id');
            mentions = users.map(u => u._id);
        }

        // Support both .array() (legacy) and .fields() (new) Multer formats
        const mediaFiles = Array.isArray(files)
            ? files
            : (files?.files || []);  // req.files.files from .fields()
        const thumbFiles = Array.isArray(files) ? [] : (files?.thumbnail || []);
        const thumbUrl = thumbFiles[0]
            ? `/${path.relative(path.join(__dirname, '../../'), thumbFiles[0].path).replace(/\\/g, '/')}`
            : null;

        // Build media array from uploaded files
        const media = mediaFiles.map((file, i) => {
            const isVideo = file.mimetype.startsWith('video/');
            const relativePart = path.relative(path.join(__dirname, '../../'), file.path).replace(/\\/g, '/');
            const fileUrl = `/${relativePart}`;
            return {
                order: i,
                type: isVideo ? 'video' : 'image',
                original_url: fileUrl,
                // Use the uploaded thumbnail blob if available, else fall back to the file itself
                thumbnail_url: (isVideo && thumbUrl) ? thumbUrl : fileUrl,
                full_url: fileUrl,
                width: 1080,
                height: 1080,
                size_bytes: file.size,
            };
        });

        const postType = type || (mediaFiles.length > 1 ? 'carousel' : (mediaFiles[0]?.mimetype.startsWith('video/') ? 'video' : 'photo'));

        const post = await Post.create({
            user_id: userId,
            type: postType,
            media,
            caption,
            hashtags,
            mentions,
            location,
        });

        // Update denormalized post count
        await User.findByIdAndUpdate(userId, { $inc: { posts_count: 1 } });

        // Update hashtag collection
        for (const tag of hashtags) {
            await Hashtag.findOneAndUpdate(
                { tag },
                { $inc: { posts_count: 1 }, last_used_at: new Date() },
                { upsert: true },
            );
        }

        const populated = await post.populate('user_id', 'username full_name avatar_url is_verified');
        return populated;
    }

    async getPost(postId, requestingUserId) {
        const post = await Post.findOne({ _id: postId, is_deleted: false })
            .populate('user_id', 'username full_name avatar_url is_verified is_private');

        if (!post) {
            const err = new Error('Post not found');
            err.status = 404;
            throw err;
        }

        const result = post.toJSON();

        if (requestingUserId) {
            const [liked, saved] = await Promise.all([
                Like.findOne({ user_id: requestingUserId, target_id: postId, target_type: 'post' }),
                Save.findOne({ user_id: requestingUserId, post_id: postId }),
            ]);
            result.is_liked = !!liked;
            result.is_saved = !!saved;
        }

        return result;
    }

    async editPost(postId, userId, updates) {
        const post = await Post.findOne({ _id: postId, user_id: userId, is_deleted: false });
        if (!post) {
            const err = new Error('Post not found or permission denied');
            err.status = 404;
            throw err;
        }

        const allowed = ['caption', 'location'];
        allowed.forEach(k => { if (updates[k] !== undefined) post[k] = updates[k]; });

        if (updates.caption !== undefined) {
            post.hashtags = extractHashtags(updates.caption);
        }

        return post.save();
    }

    async deletePost(postId, userId) {
        const post = await Post.findOne({ _id: postId, user_id: userId });
        if (!post) {
            const err = new Error('Post not found');
            err.status = 404;
            throw err;
        }
        post.is_deleted = true;
        await post.save();
        await User.findByIdAndUpdate(userId, { $inc: { posts_count: -1 } });
        return { deleted: true };
    }

    async likePost(postId, userId) {
        const post = await Post.findOne({ _id: postId, is_deleted: false });
        if (!post) {
            const err = new Error('Post not found');
            err.status = 404;
            throw err;
        }

        try {
            await Like.create({ user_id: userId, target_id: postId, target_type: 'post' });
            await Post.findByIdAndUpdate(postId, { $inc: { likes_count: 1 } });
            return { liked: true, likes_count: post.likes_count + 1 };
        } catch (e) {
            if (e.code === 11000) return { liked: true, likes_count: post.likes_count }; // Already liked
            throw e;
        }
    }

    async unlikePost(postId, userId) {
        const post = await Post.findById(postId);
        if (!post) {
            const err = new Error('Post not found');
            err.status = 404;
            throw err;
        }

        const deleted = await Like.findOneAndDelete({ user_id: userId, target_id: postId, target_type: 'post' });
        if (deleted) {
            await Post.findByIdAndUpdate(postId, { $inc: { likes_count: -1 } });
        }
        return { liked: false };
    }

    async getPostLikes(postId, cursor, limit = 20) {
        const query = { target_id: postId, target_type: 'post' };
        if (cursor) query._id = { $lt: cursor };

        const likes = await Like.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate('user_id', 'username full_name avatar_url is_verified');

        const hasMore = likes.length > limit;
        if (hasMore) likes.pop();

        return { users: likes.map(l => l.user_id), next_cursor: hasMore ? likes[likes.length - 1]._id : null };
    }

    async savePost(postId, userId, collection_name) {
        const post = await Post.findOne({ _id: postId, is_deleted: false });
        if (!post) {
            const err = new Error('Post not found');
            err.status = 404;
            throw err;
        }

        try {
            const save = await Save.create({ user_id: userId, post_id: postId, collection_name });
            await Post.findByIdAndUpdate(postId, { $inc: { saves_count: 1 } });
            return save;
        } catch (e) {
            if (e.code === 11000) return { already_saved: true };
            throw e;
        }
    }

    async unsavePost(postId, userId) {
        const deleted = await Save.findOneAndDelete({ user_id: userId, post_id: postId });
        if (deleted) await Post.findByIdAndUpdate(postId, { $inc: { saves_count: -1 } });
        return { saved: false };
    }

    async toggleArchive(postId, userId) {
        const post = await Post.findOne({ _id: postId, user_id: userId, is_deleted: false });
        if (!post) {
            const err = new Error('Post not found');
            err.status = 404;
            throw err;
        }
        post.is_archived = !post.is_archived;
        return post.save();
    }

    async toggleComments(postId, userId) {
        const post = await Post.findOne({ _id: postId, user_id: userId, is_deleted: false });
        if (!post) {
            const err = new Error('Post not found');
            err.status = 404;
            throw err;
        }
        post.is_comments_disabled = !post.is_comments_disabled;
        return post.save();
    }
}

module.exports = new PostService();
