const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshTokenBlocklist = require('../models/RefreshTokenBlocklist');
const { generateAccessToken, generateRefreshToken, hashToken } = require('../middleware/auth');

class AuthService {
    async register({ username, email, password, full_name }) {
        // Check uniqueness
        const existing = await User.findOne({
            $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
        });
        if (existing) {
            const field = existing.username === username.toLowerCase() ? 'username' : 'email';
            const err = new Error(`${field} already taken`);
            err.status = 409;
            err.code = 'CONFLICT';
            throw err;
        }

        const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        const password_hash = await bcrypt.hash(password, rounds);
        const email_verify_token = crypto.randomBytes(32).toString('hex');

        const user = await User.create({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password_hash,
            full_name: full_name || '',
            email_verify_token,
        });

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Store hashed refresh token
        user.refresh_token_hash = hashToken(refreshToken);
        await user.save();

        return { user, accessToken, refreshToken };
    }

    async login({ login, password }) {
        const query = login.includes('@') ? { email: login.toLowerCase() } : { username: login.toLowerCase() };
        const user = await User.findOne(query).select('+password_hash +refresh_token_hash');

        if (!user || !user.is_active) {
            const err = new Error('Invalid credentials');
            err.status = 401;
            err.code = 'UNAUTHORIZED';
            throw err;
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            const err = new Error('Invalid credentials');
            err.status = 401;
            err.code = 'UNAUTHORIZED';
            throw err;
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);
        user.refresh_token_hash = hashToken(refreshToken);
        await user.save();

        return { user, accessToken, refreshToken };
    }

    async refreshToken(refreshToken) {
        const jwt = require('jsonwebtoken');

        // Check blocklist
        const tokenHash = hashToken(refreshToken);
        const blocked = await RefreshTokenBlocklist.findOne({ token_hash: tokenHash });
        if (blocked) {
            const err = new Error('Token revoked');
            err.status = 401;
            throw err;
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch {
            const err = new Error('Invalid refresh token');
            err.status = 401;
            throw err;
        }

        const user = await User.findById(decoded.userId).select('+refresh_token_hash');
        if (!user || !user.is_active) {
            const err = new Error('User not found');
            err.status = 401;
            throw err;
        }

        if (user.refresh_token_hash !== tokenHash) {
            const err = new Error('Token mismatch');
            err.status = 401;
            throw err;
        }

        const newAccessToken = generateAccessToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);
        user.refresh_token_hash = hashToken(newRefreshToken);
        await user.save();

        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }

    async logout(userId, refreshToken) {
        const jwt = require('jsonwebtoken');
        let expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const tokenHash = hashToken(refreshToken);

        try {
            const decoded = jwt.decode(refreshToken);
            if (decoded?.exp) expiresAt = new Date(decoded.exp * 1000);
        } catch { }

        await RefreshTokenBlocklist.create({ token_hash: tokenHash, user_id: userId, expires_at: expiresAt });

        const user = await User.findById(userId);
        if (user) {
            user.refresh_token_hash = undefined;
            await user.save();
        }
    }

    async forgotPassword(email) {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return; // Silently succeed to prevent email enumeration

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.password_reset_token = hashToken(otp);
        user.password_reset_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        await user.save();

        // Send email via nodemailer (configured in server)
        return { otp, email: user.email };
    }

    async resetPassword({ email, otp, newPassword }) {
        const user = await User.findOne({
            email: email.toLowerCase(),
            password_reset_token: hashToken(otp),
            password_reset_expires: { $gt: new Date() },
        }).select('+password_reset_token +password_reset_expires');

        if (!user) {
            const err = new Error('Invalid or expired OTP');
            err.status = 400;
            throw err;
        }

        const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        user.password_hash = await bcrypt.hash(newPassword, rounds);
        user.password_reset_token = undefined;
        user.password_reset_expires = undefined;
        await user.save();
    }

    async verifyEmail(token) {
        const user = await User.findOne({ email_verify_token: token }).select('+email_verify_token');
        if (!user) {
            const err = new Error('Invalid verification token');
            err.status = 400;
            throw err;
        }
        user.is_email_verified = true;
        user.email_verify_token = undefined;
        await user.save();
        return user;
    }

    async changePassword(userId, { currentPassword, newPassword }) {
        const user = await User.findById(userId).select('+password_hash');
        const isValid = await user.comparePassword(currentPassword);
        if (!isValid) {
            const err = new Error('Current password is incorrect');
            err.status = 400;
            throw err;
        }
        const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        user.password_hash = await bcrypt.hash(newPassword, rounds);
        await user.save();
    }
}

module.exports = new AuthService();
