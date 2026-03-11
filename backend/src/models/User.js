const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const notificationSettingsSchema = new mongoose.Schema({
  likes: { type: Boolean, default: true },
  comments: { type: Boolean, default: true },
  comment_likes: { type: Boolean, default: true },
  follows: { type: Boolean, default: true },
  follow_requests: { type: Boolean, default: true },
  mentions: { type: Boolean, default: true },
  live_videos: { type: Boolean, default: true },
  story_reactions: { type: Boolean, default: true },
  email_notifications: { type: Boolean, default: false },
}, { _id: false });

const recentSearchSchema = new mongoose.Schema({
  type: { type: String, enum: ['user', 'hashtag', 'query'] },
  id: { type: mongoose.Schema.Types.ObjectId },
  query: String,
  searchedAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-zA-Z0-9_]{3,30}$/, 'Username must be 3-30 chars, alphanumeric and underscores only'],
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password_hash: {
    type: String,
    required: true,
    select: false,
  },
  full_name: { type: String, maxlength: 100, default: '' },
  bio: { type: String, maxlength: 150, default: '' },
  website: { type: String, default: '' },
  avatar_url: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female', 'custom', 'prefer_not_to_say', ''], default: '' },
  date_of_birth: { type: Date },
  followers_count: { type: Number, default: 0, min: 0 },
  following_count: { type: Number, default: 0, min: 0 },
  posts_count: { type: Number, default: 0, min: 0 },
  is_private: { type: Boolean, default: false },
  is_verified: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  is_email_verified: { type: Boolean, default: false },
  notification_settings: { type: notificationSettingsSchema, default: () => ({}) },
  saved_posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  close_friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blocked_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  recent_searches: [recentSearchSchema],
  refresh_token_hash: { type: String, select: false },
  password_reset_token: { type: String, select: false },
  password_reset_expires: { type: Date, select: false },
  email_verify_token: { type: String, select: false },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Indexes
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ created_at: -1 });

// Remove sensitive fields from JSON output
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password_hash;
    delete ret.refresh_token_hash;
    delete ret.password_reset_token;
    delete ret.password_reset_expires;
    delete ret.email_verify_token;
    delete ret.blocked_users;
    delete ret.__v;
    return ret;
  },
});

// Instance method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

module.exports = mongoose.model('User', userSchema);
