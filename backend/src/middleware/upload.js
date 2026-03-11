const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const UPLOAD_BASE = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const imageFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, WebP images are allowed'), false);
    }
};

const videoFilter = (req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only MP4, MOV, WebM videos are allowed'), false);
    }
};

const mediaFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Unsupported file type'), false);
    }
};

// Post media upload — disk storage
const postStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(UPLOAD_BASE, 'posts', req.user._id.toString());
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
});

// Avatar upload — disk storage
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(UPLOAD_BASE, 'avatars');
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${req.user._id.toString()}.jpg`);
    },
});

// Story upload
const storyStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(UPLOAD_BASE, 'stories', req.user._id.toString());
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
});

const MAX_IMAGE_SIZE  = parseInt(process.env.MAX_IMAGE_SIZE_MB  || '10') * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE  = parseInt(process.env.MAX_VIDEO_SIZE_MB  || '50') * 1024 * 1024; // 50 MB
const MAX_AVATAR_SIZE = parseInt(process.env.MAX_AVATAR_SIZE_MB || '5')  * 1024 * 1024; // 5 MB

// Post media upload — supports 'files' array + optional 'thumbnail'
const uploadPostMedia = multer({
    storage: postStorage,
    fileFilter: mediaFilter,
    limits: { files: 11, fileSize: MAX_VIDEO_SIZE }, // 10 media + 1 thumbnail
}).fields([
    { name: 'files', maxCount: 10 },
    { name: 'thumbnail', maxCount: 1 },
]);

// Reel upload — 'files' = the video, 'thumbnail' = optional first-frame JPEG
const uploadReelMedia = multer({
    storage: postStorage,
    fileFilter: mediaFilter,
    limits: { files: 2, fileSize: MAX_VIDEO_SIZE },
}).fields([
    { name: 'files', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
]);

const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: imageFilter,
    limits: { files: 1, fileSize: MAX_AVATAR_SIZE },
}).single('avatar');

const uploadStory = multer({
    storage: storyStorage,
    fileFilter: mediaFilter,
    limits: { files: 1, fileSize: MAX_VIDEO_SIZE },
}).single('file');

const uploadMessageMedia = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(UPLOAD_BASE, 'messages', req.user._id.toString());
            ensureDir(dir);
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
        },
    }),
    fileFilter: mediaFilter,
    limits: { files: 1, fileSize: MAX_VIDEO_SIZE },
}).single('media');

module.exports = { uploadPostMedia, uploadReelMedia, uploadAvatar, uploadStory, uploadMessageMedia, UPLOAD_BASE };
