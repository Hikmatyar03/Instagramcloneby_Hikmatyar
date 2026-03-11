const mongoose = require('mongoose');

const saveSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    collection_name: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at' },
});

saveSchema.index({ user_id: 1, post_id: 1 }, { unique: true });
saveSchema.index({ user_id: 1, collection_name: 1 });

module.exports = mongoose.model('Save', saveSchema);
