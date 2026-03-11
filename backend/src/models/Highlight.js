const mongoose = require('mongoose');

const highlightSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 15 },
    cover_url: { type: String },
    story_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }],
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

highlightSchema.index({ user_id: 1 });

module.exports = mongoose.model('Highlight', highlightSchema);
