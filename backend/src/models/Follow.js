const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
    follower_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    following_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['accepted', 'pending'], default: 'accepted' },
    accepted_at: { type: Date },
}, {
    timestamps: { createdAt: 'created_at' },
});

followSchema.index({ follower_id: 1, following_id: 1 }, { unique: true });
followSchema.index({ follower_id: 1 });
followSchema.index({ following_id: 1 });
followSchema.index({ following_id: 1, status: 1 });

module.exports = mongoose.model('Follow', followSchema);
