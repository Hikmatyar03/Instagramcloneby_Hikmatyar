const jwt = require('jsonwebtoken');
const MessageService = require('../services/MessageService');
const NotificationService = require('../services/NotificationService');
const LiveService = require('../services/LiveService');

// Track online users: userId -> Set of socket IDs
const onlineUsers = new Map();

const setupSocket = (io) => {
    // JWT authentication middleware for Socket.IO
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return next(new Error('Authentication required'));
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.userId.toString();
        console.log(`[Socket] User ${userId} connected (${socket.id})`);

        // Join personal room for targeted notifications
        socket.join(`user:${userId}`);

        // Track online status
        if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
        onlineUsers.get(userId).add(socket.id);

        // ─── MESSAGING ───────────────────────────────────────────────────────────

        // Join conversation rooms
        socket.on('join_conversation', (conversationId) => {
            socket.join(`conversation:${conversationId}`);
        });

        socket.on('leave_conversation', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
        });

        // Send message via socket (alternative to REST)
        socket.on('send_message', async ({ conversationId, message_type, content, reply_to_id }) => {
            try {
                const msg = await MessageService.sendMessage(conversationId, socket.userId, { message_type, content, reply_to_id });
                io.to(`conversation:${conversationId}`).emit('new_message', msg);
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        // Typing indicators (ephemeral — not stored)
        socket.on('typing_start', ({ conversationId }) => {
            socket.to(`conversation:${conversationId}`).emit('user_typing', { userId, conversationId });
        });

        socket.on('typing_stop', ({ conversationId }) => {
            socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', { userId, conversationId });
        });

        // Read receipts
        socket.on('mark_read', async ({ conversationId }) => {
            try {
                await MessageService.markRead(conversationId, socket.userId);
                socket.to(`conversation:${conversationId}`).emit('messages_read', { conversationId, userId });
            } catch { }
        });

        // ─── LIVE VIDEO SIGNALING ─────────────────────────────────────────────────

        socket.on('join_live', ({ streamId }) => {
            socket.join(`live:${streamId}`);
            LiveService.updateViewerCount(streamId, 1).then(count => {
                io.to(`live:${streamId}`).emit('viewer_count', { streamId, count });
            });
        });

        socket.on('leave_live', ({ streamId }) => {
            socket.leave(`live:${streamId}`);
            LiveService.updateViewerCount(streamId, -1).then(count => {
                io.to(`live:${streamId}`).emit('viewer_count', { streamId, count });
            });
        });

        // WebRTC signaling relay
        socket.on('live_offer', ({ streamId, offer }) => {
            socket.to(`live:${streamId}`).emit('live_offer', { from: socket.id, offer });
        });

        socket.on('live_answer', ({ streamId, answer, to }) => {
            io.to(to).emit('live_answer', { from: socket.id, answer });
        });

        socket.on('live_ice_candidate', ({ streamId, candidate, to }) => {
            if (to) {
                io.to(to).emit('live_ice_candidate', { from: socket.id, candidate });
            } else {
                socket.to(`live:${streamId}`).emit('live_ice_candidate', { from: socket.id, candidate });
            }
        });

        // Live chat comment
        socket.on('live_comment', async ({ streamId, text }) => {
            try {
                const comment = await LiveService.addComment(streamId, socket.userId, null, text);
                io.to(`live:${streamId}`).emit('live_comment', { streamId, comment });
            } catch { }
        });

        // ─── NOTIFICATION PUSH ────────────────────────────────────────────────────

        // Push notification to a user's personal room
        socket.on('ping', () => socket.emit('pong'));

        // ─── DISCONNECT ──────────────────────────────────────────────────────────

        socket.on('disconnect', () => {
            console.log(`[Socket] User ${userId} disconnected (${socket.id})`);
            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) onlineUsers.delete(userId);
            }
        });
    });

    return { onlineUsers };
};

/**
 * Push notification to a user if they are online
 */
const pushNotification = (io, userId, notification) => {
    io.to(`user:${userId.toString()}`).emit('notification', notification);
};

/**
 * Push new message to conversation room
 */
const pushMessage = (io, conversationId, message) => {
    io.to(`conversation:${conversationId.toString()}`).emit('new_message', message);
};

module.exports = { setupSocket, pushNotification, pushMessage, onlineUsers };
