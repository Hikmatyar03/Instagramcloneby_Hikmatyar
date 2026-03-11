const mongoose = require('mongoose');

const hashtagSchema = new mongoose.Schema({
    tag: { type: String, required: true, unique: true, lowercase: true, trim: true },
    posts_count: { type: Number, default: 0 },
    last_used_at: { type: Date, default: Date.now },
}, {
    timestamps: { createdAt: 'created_at' },
});

hashtagSchema.index({ posts_count: -1 });
hashtagSchema.index({ last_used_at: -1 });

module.exports = mongoose.model('Hashtag', hashtagSchema);
