const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    target_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    target_type: { type: String, enum: ['post', 'comment', 'message'], required: true },
}, {
    timestamps: { createdAt: 'created_at' },
});

likeSchema.index({ user_id: 1, target_id: 1, target_type: 1 }, { unique: true });
likeSchema.index({ target_id: 1, target_type: 1 });

module.exports = mongoose.model('Like', likeSchema);
