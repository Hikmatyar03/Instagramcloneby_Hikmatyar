const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    from_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: [
            'like', 'comment', 'reply', 'mention',
            'follow', 'follow_request', 'follow_accept',
            'live_start', 'story_reaction',
            'post_share', 'comment_like',
            'share', 'message',            // Iteration 3 additions
        ],
        required: true,
    },
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    comment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    story_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
    message: { type: String },
    is_read: { type: Boolean, default: false },
}, {
    timestamps: { createdAt: 'created_at' },
});

notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });
notificationSchema.index({ user_id: 1, created_at: -1 });
// Prevent duplicate notifications (e.g. user reliking the same post)
notificationSchema.index(
    { user_id: 1, from_user_id: 1, type: 1, post_id: 1 },
    { unique: true, sparse: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
