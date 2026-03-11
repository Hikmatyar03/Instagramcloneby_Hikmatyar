const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    text: { type: String, required: true, maxlength: 1000 },
    likes_count: { type: Number, default: 0 },
    replies_count: { type: Number, default: 0 },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    is_pinned: { type: Boolean, default: false },
    is_deleted: { type: Boolean, default: false },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

commentSchema.index({ post_id: 1, created_at: -1 });
commentSchema.index({ parent_id: 1, created_at: 1 });
commentSchema.index({ user_id: 1 });

module.exports = mongoose.model('Comment', commentSchema);
