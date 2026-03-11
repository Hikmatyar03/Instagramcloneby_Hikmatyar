const mongoose = require('mongoose');

const stickerSchema = new mongoose.Schema({
    type: String,
    x: Number,
    y: Number,
    data: mongoose.Schema.Types.Mixed,
}, { _id: false });

const viewerSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    viewed_at: { type: Date, default: Date.now },
}, { _id: false });

const reactionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
    reacted_at: { type: Date, default: Date.now },
}, { _id: false });

const storySchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    media_type: { type: String, enum: ['image', 'video'], required: true },
    media_url: { type: String, required: true },
    thumbnail_url: { type: String, required: true },
    hls_url: { type: String },
    duration: { type: Number, default: 5 },
    caption: { type: String, maxlength: 200, default: '' },
    stickers: [stickerSchema],
    audience: { type: String, enum: ['public', 'followers', 'close_friends'], default: 'followers' },
    viewers: [viewerSchema],
    reactions: [reactionSchema],
    is_highlight: { type: Boolean, default: false },
    highlight_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Highlight' },
    expires_at: { type: Date, required: true },
}, {
    timestamps: { createdAt: 'created_at' },
});

storySchema.index({ user_id: 1, created_at: -1 });
storySchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model('Story', storySchema);
