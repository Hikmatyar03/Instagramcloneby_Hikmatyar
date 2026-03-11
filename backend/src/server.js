require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const path = require('path');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const storyRoutes = require('./routes/stories');
const highlightRoutes = require('./routes/highlights');
const reelRoutes = require('./routes/reels');
const liveRoutes = require('./routes/live');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const followRequestRoutes = require('./routes/followRequests');
const searchRoutes = require('./routes/search');
const shareRoutes = require('./routes/share');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { setupSocket } = require('./socket');

const app = express();
const httpServer = http.createServer(app);

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));

// ─── Rate limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'RATE_LIMIT', message: 'Too many requests' },
});
app.use(globalLimiter);

// ─── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ─── Static file serving (uploads) ────────────────────────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
app.use('/uploads', express.static(UPLOAD_DIR, {
    maxAge: '1y',
    etag: true,
}));

// Auto-create upload directories on startup so Multer never crashes on a missing folder
const fs = require('fs');
['', 'posts', 'avatars', 'stories', 'messages', 'reels'].forEach(sub => {
    fs.mkdirSync(path.join(UPLOAD_DIR, sub), { recursive: true });
});


// ─── API Routes ────────────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/posts`, postRoutes);
app.use(`${API}/comments`, commentRoutes);
app.use(`${API}/stories`, storyRoutes);
app.use(`${API}/highlights`, highlightRoutes);
app.use(`${API}/reels`, reelRoutes);
app.use(`${API}/live`, liveRoutes);
app.use(`${API}/conversations`, conversationRoutes);
app.use(`${API}/messages`, messageRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/follow-requests`, followRequestRoutes);
app.use(`${API}/search`, searchRoutes);
app.use(`${API}/hashtags`, searchRoutes); // shared router — hashtag-specific routes
app.use(`${API}/share`, shareRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── 404 and Error handlers ────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
        credentials: true,
    },
    pingTimeout: 60000,
});
setupSocket(io);
// Make io available via req.app.get('io') in all route handlers
app.set('io', io);

// ─── MongoDB Connection ────────────────────────────────────────────────────────
const connectDB = async () => {
    // Skip if already connected (e.g. in tests where multiple files import server.js)
    if (mongoose.connection.readyState === 1) return;
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/instaclone', {
            maxPoolSize: 10,
        });
        console.log('[MongoDB] Connected to', mongoose.connection.name);
    } catch (err) {
        console.error('[MongoDB] Connection failed:', err.message);
        process.exit(1);
    }
};

// ─── Scheduled Jobs (node-cron) ────────────────────────────────────────────────
const setupCronJobs = () => {
    const Post = require('./models/Post');

    // Clean expired stories every hour
    const cleanExpiredStories = async () => {
        try {
            const result = await Post.deleteMany({
                type: 'story',
                expires_at: { $lt: new Date() },
            });
            if (result.deletedCount > 0)
                console.log(`[Cron] Cleaned ${result.deletedCount} expired stories`);
        } catch (e) {
            console.error('[Cron] Story cleanup error:', e.message);
        }
    };
    cleanExpiredStories(); // run once on startup
    cron.schedule('0 * * * *', cleanExpiredStories); // every hour

    console.log('[Cron] Scheduled jobs initialized');
};

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    setupCronJobs();
    httpServer.listen(PORT, () => {
        console.log(`[Server] Running on http://localhost:${PORT}`);
        console.log(`[API] Base URL: http://localhost:${PORT}/api/v1`);
        console.log(`[Socket.IO] WebSocket server ready`);
        console.log(`[Environment] ${process.env.NODE_ENV || 'development'}`);
    });
});

module.exports = { app, httpServer };
