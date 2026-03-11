const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const AuthService = require('../services/AuthService');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// POST /auth/register
router.post('/register', [
    body('username').matches(/^[a-zA-Z0-9_]{3,30}$/).withMessage('Invalid username'),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-zA-Z])(?=.*\d)/).withMessage('Password must be 8+ chars with letter and number'),
    validate,
], async (req, res, next) => {
    try {
        const { user, accessToken, refreshToken } = await AuthService.register(req.body);
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.status(201).json({ success: true, data: { accessToken, user } });
    } catch (e) { next(e); }
});

// POST /auth/login
router.post('/login', [
    body('login').notEmpty().withMessage('Email or username required'),
    body('password').notEmpty(),
    validate,
], async (req, res, next) => {
    try {
        const { user, accessToken, refreshToken } = await AuthService.login(req.body);
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({ success: true, data: { accessToken, user } });
    } catch (e) { next(e); }
});

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) return res.status(401).json({ success: false, error: 'NO_TOKEN', message: 'No refresh token' });
        const { accessToken, refreshToken: newRefresh } = await AuthService.refreshToken(refreshToken);
        res.cookie('refreshToken', newRefresh, {
            httpOnly: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({ success: true, data: { accessToken } });
    } catch (e) { next(e); }
});

// POST /auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) await AuthService.logout(req.user._id, refreshToken);
        res.clearCookie('refreshToken');
        res.status(204).end();
    } catch (e) { next(e); }
});

// POST /auth/forgot-password
router.post('/forgot-password', [body('email').isEmail(), validate], async (req, res, next) => {
    try {
        await AuthService.forgotPassword(req.body.email);
        res.json({ success: true, message: 'If that email exists, a reset code was sent.' });
    } catch (e) { next(e); }
});

// POST /auth/reset-password
router.post('/reset-password', [
    body('email').isEmail(), body('otp').notEmpty(), body('newPassword').isLength({ min: 8 }), validate,
], async (req, res, next) => {
    try {
        await AuthService.resetPassword(req.body);
        res.json({ success: true, message: 'Password reset successful.' });
    } catch (e) { next(e); }
});

// GET /auth/verify-email/:token
router.get('/verify-email/:token', async (req, res, next) => {
    try {
        await AuthService.verifyEmail(req.params.token);
        res.json({ success: true, message: 'Email verified.' });
    } catch (e) { next(e); }
});

// POST /auth/change-password
router.post('/change-password', authenticate, [
    body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 8 }), validate,
], async (req, res, next) => {
    try {
        await AuthService.changePassword(req.user._id, req.body);
        res.json({ success: true, message: 'Password changed.' });
    } catch (e) { next(e); }
});

module.exports = router;
