const mongoose = require('mongoose');

const unreadCountSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    count: { type: Number, default: 0 },
}, { _id: false });

const conversationSchema = new mongoose.Schema({
    type: { type: String, enum: ['direct', 'group'], default: 'direct' },
    participants: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        required: true,
        validate: {
            validator: function (v) {
                if (this.type === 'direct') return v.length === 2;
                return v.length >= 2 && v.length <= 32;
            },
            message: 'Direct conversations must have 2 participants; groups must have 2-32.',
        },
    },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    name: { type: String, maxlength: 50 },
    avatar_url: { type: String },
    last_message_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    last_message_at: { type: Date },
    last_message_preview: { type: String, maxlength: 100 },
    unread_counts: [unreadCountSchema],
    disappearing_messages_ttl: { type: Number, default: null },
    muted_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // One-message gate: tracks whether the recipient has accepted the request
    request_accepted: { type: Boolean, default: false },
    request_sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, {
    timestamps: { createdAt: 'created_at' },
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ last_message_at: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
