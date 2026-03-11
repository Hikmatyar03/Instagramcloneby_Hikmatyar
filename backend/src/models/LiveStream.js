const mongoose = require('mongoose');

const liveCommentSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    text: String,
    sent_at: { type: Date, default: Date.now },
}, { _id: false });

const liveStreamSchema = new mongoose.Schema({
    stream_id: { type: String, required: true, unique: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, maxlength: 100, default: '' },
    thumbnail_url: { type: String, default: '' },
    status: { type: String, enum: ['live', 'ended', 'saved'], default: 'live' },
    viewer_count: { type: Number, default: 0 },
    peak_viewer_count: { type: Number, default: 0 },
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [liveCommentSchema],
    co_host_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    replay_post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    started_at: { type: Date, default: Date.now },
    ended_at: { type: Date },
}, {
    timestamps: { createdAt: 'created_at' },
});

liveStreamSchema.index({ user_id: 1, status: 1 });
liveStreamSchema.index({ status: 1 });

module.exports = mongoose.model('LiveStream', liveStreamSchema);
