const mongoose = require('mongoose');

const messageReactionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
    reacted_at: { type: Date, default: Date.now },
}, { _id: false });

const readBySchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    read_at: { type: Date, default: Date.now },
}, { _id: false });

const messageSchema = new mongoose.Schema({
    conversation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message_type: {
        type: String,
        enum: ['text', 'image', 'video', 'voice', 'post_share', 'story_share', 'reaction'],
        required: true,
    },
    content: { type: String, maxlength: 1000 },
    media_url: { type: String },
    shared_post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    shared_story_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
    reactions: [messageReactionSchema],
    reply_to_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    is_read: { type: Boolean, default: false },
    read_by: [readBySchema],
    is_deleted: { type: Boolean, default: false },
    is_unsent: { type: Boolean, default: false },
    disappears_at: { type: Date },
}, {
    timestamps: { createdAt: 'created_at' },
});

messageSchema.index({ conversation_id: 1, created_at: -1 });
messageSchema.index({ sender_id: 1 });

module.exports = mongoose.model('Message', messageSchema);
