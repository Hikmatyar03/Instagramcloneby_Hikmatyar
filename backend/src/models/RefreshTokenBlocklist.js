const mongoose = require('mongoose');

const refreshTokenBlocklistSchema = new mongoose.Schema({
    token_hash: { type: String, required: true, unique: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expires_at: { type: Date, required: true },
});

// TTL index — MongoDB auto-purges documents after expires_at
refreshTokenBlocklistSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
refreshTokenBlocklistSchema.index({ token_hash: 1 }, { unique: true });
refreshTokenBlocklistSchema.index({ user_id: 1 });

module.exports = mongoose.model('RefreshTokenBlocklist', refreshTokenBlocklistSchema);
