const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshTokenBlocklist = require('../models/RefreshTokenBlocklist');
const crypto = require('crypto');

/**
 * Middleware: Verify JWT access token
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId).select('+refresh_token_hash');
        if (!user || !user.is_active) {
            return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not found or deactivated' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, error: 'TOKEN_EXPIRED', message: 'Access token expired' });
        }
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Invalid token' });
    }
};

/**
 * Middleware: Optional auth — attaches user if token present but doesn't fail
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (user && user.is_active) req.user = user;
        next();
    } catch {
        next();
    }
};

/**
 * Generate signed JWT access token
 */
const generateAccessToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
};

/**
 * Generate signed JWT refresh token
 */
const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
};

/**
 * Hash a token with SHA-256 (for blocklist storage)
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = { authenticate, optionalAuth, generateAccessToken, generateRefreshToken, hashToken };
