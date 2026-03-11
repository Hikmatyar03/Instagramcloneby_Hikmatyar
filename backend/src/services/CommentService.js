const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Like = require('../models/Like');
const User = require('../models/User');

const extractMentions = (text) => {
    const matches = text.match(/@([a-zA-Z0-9_]+)/g) || [];
    return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
};

class CommentService {
    async addComment(postId, userId, text) {
        const post = await Post.findOne({ _id: postId, is_deleted: false, is_comments_disabled: false });
        if (!post) {
            const err = new Error('Post not found or comments are disabled');
            err.status = 404;
            throw err;
        }

        const mentionUsernames = extractMentions(text);
        let mentions = [];
        if (mentionUsernames.length) {
            const users = await User.find({ username: { $in: mentionUsernames } }).select('_id');
            mentions = users.map(u => u._id);
        }

        const comment = await Comment.create({ post_id: postId, user_id: userId, text, mentions });
        await Post.findByIdAndUpdate(postId, { $inc: { comments_count: 1 } });

        return comment.populate('user_id', 'username full_name avatar_url is_verified');
    }

    async addReply(commentId, userId, text) {
        const parent = await Comment.findOne({ _id: commentId, is_deleted: false, parent_id: null });
        if (!parent) {
            const err = new Error('Comment not found or cannot reply to a reply');
            err.status = 404;
            throw err;
        }

        const mentionUsernames = extractMentions(text);
        let mentions = [];
        if (mentionUsernames.length) {
            const users = await User.find({ username: { $in: mentionUsernames } }).select('_id');
            mentions = users.map(u => u._id);
        }

        const reply = await Comment.create({
            post_id: parent.post_id,
            user_id: userId,
            parent_id: commentId,
            text,
            mentions,
        });

        await Comment.findByIdAndUpdate(commentId, { $inc: { replies_count: 1 } });
        await Post.findByIdAndUpdate(parent.post_id, { $inc: { comments_count: 1 } });

        return reply.populate('user_id', 'username full_name avatar_url is_verified');
    }

    async getComments(postId, cursor, limit = 20) {
        const query = { post_id: postId, parent_id: null, is_deleted: false };
        if (cursor) query._id = { $lt: cursor };

        const comments = await Comment.find(query)
            .sort({ is_pinned: -1, _id: -1 })
            .limit(limit + 1)
            .populate('user_id', 'username full_name avatar_url is_verified');

        const hasMore = comments.length > limit;
        if (hasMore) comments.pop();

        return { comments, next_cursor: hasMore ? comments[comments.length - 1]._id : null };
    }

    async getReplies(commentId, cursor, limit = 20) {
        const query = { parent_id: commentId, is_deleted: false };
        if (cursor) query._id = { $gt: cursor };

        const replies = await Comment.find(query)
            .sort({ _id: 1 })
            .limit(limit + 1)
            .populate('user_id', 'username full_name avatar_url is_verified');

        const hasMore = replies.length > limit;
        if (hasMore) replies.pop();

        return { replies, next_cursor: hasMore ? replies[replies.length - 1]._id : null };
    }

    async deleteComment(commentId, requestingUserId) {
        const comment = await Comment.findById(commentId).populate('post_id', 'user_id');
        if (!comment || comment.is_deleted) {
            const err = new Error('Comment not found');
            err.status = 404;
            throw err;
        }

        const isOwner = comment.user_id.toString() === requestingUserId.toString();
        const isPostOwner = comment.post_id.user_id?.toString() === requestingUserId.toString();

        if (!isOwner && !isPostOwner) {
            const err = new Error('Permission denied');
            err.status = 403;
            throw err;
        }

        comment.is_deleted = true;
        await comment.save();
        await Post.findByIdAndUpdate(comment.post_id, { $inc: { comments_count: -1 } });

        return { deleted: true };
    }

    async pinComment(commentId, userId) {
        const comment = await Comment.findOne({ _id: commentId, parent_id: null, is_deleted: false })
            .populate('post_id', 'user_id');

        if (!comment) {
            const err = new Error('Comment not found');
            err.status = 404;
            throw err;
        }

        if (comment.post_id.user_id?.toString() !== userId.toString()) {
            const err = new Error('Permission denied');
            err.status = 403;
            throw err;
        }

        comment.is_pinned = !comment.is_pinned;
        return comment.save();
    }

    async likeComment(commentId, userId) {
        try {
            await Like.create({ user_id: userId, target_id: commentId, target_type: 'comment' });
            await Comment.findByIdAndUpdate(commentId, { $inc: { likes_count: 1 } });
            return { liked: true };
        } catch (e) {
            if (e.code === 11000) return { liked: true };
            throw e;
        }
    }

    async unlikeComment(commentId, userId) {
        const deleted = await Like.findOneAndDelete({ user_id: userId, target_id: commentId, target_type: 'comment' });
        if (deleted) await Comment.findByIdAndUpdate(commentId, { $inc: { likes_count: -1 } });
        return { liked: false };
    }
}

module.exports = new CommentService();
