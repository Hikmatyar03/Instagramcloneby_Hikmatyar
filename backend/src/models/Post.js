const mongoose = require('mongoose');

const mediaItemSchema = new mongoose.Schema({
    order: { type: Number, required: true, default: 0 },
    type: { type: String, enum: ['image', 'video'], required: true },
    original_url: { type: String, required: true },
    thumbnail_url: { type: String, required: true },
    medium_url: { type: String },
    full_url: { type: String, required: true },
    hls_url: { type: String },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    duration: { type: Number },
    size_bytes: { type: Number, required: true },
}, { _id: false });

const postSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['photo', 'video', 'reel', 'carousel'], required: true },
    media: { type: [mediaItemSchema], required: true, validate: v => v.length >= 1 && v.length <= 10 },
    caption: { type: String, maxlength: 2200, default: '' },
    hashtags: { type: [String], default: [], validate: v => v.length <= 30 },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    location: { type: String, maxlength: 50, default: '' },
    likes_count: { type: Number, default: 0 },
    comments_count: { type: Number, default: 0 },
    saves_count: { type: Number, default: 0 },
    views_count: { type: Number, default: 0 },
    is_deleted: { type: Boolean, default: false },
    is_archived: { type: Boolean, default: false },
    is_comments_disabled: { type: Boolean, default: false },
    is_likes_hidden: { type: Boolean, default: false },
    allow_sharing: { type: Boolean, default: true },
    // Story expiry — auto-set to 24h for type==='story' via pre-save hook
    expires_at: { type: Date, default: null },
    // Aspect ratio — '9:16' for reels/stories, '1:1' or '4:5' for posts
    aspect_ratio: { type: String, default: '1:1' },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

postSchema.index({ user_id: 1, created_at: -1 });
postSchema.index({ created_at: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ type: 1 });
postSchema.index({ is_deleted: 1, is_archived: 1, created_at: -1 });
postSchema.index({ expires_at: 1 }, { sparse: true });

// Auto-set expires_at for stories (24 hours)
postSchema.pre('save', function (next) {
    if (this.type === 'story' && !this.expires_at) {
        this.expires_at = new Date(Date.now() + 86_400_000); // 24h
    }
    next();
});

postSchema.set('toJSON', {
    transform(doc, ret) {
        delete ret.__v;
        return ret;
    },
});

module.exports = mongoose.model('Post', postSchema);
