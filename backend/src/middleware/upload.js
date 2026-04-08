const multer = require('multer');

// All storage uses memory — files are uploaded directly to Cloudinary as buffers.
// Nothing is ever written to the ephemeral Render filesystem.
const memStorage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, WebP, GIF images are allowed'), false);
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
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Unsupported file type'), false);
    }
};

const MAX_IMAGE_SIZE  = parseInt(process.env.MAX_IMAGE_SIZE_MB  || '10') * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE  = parseInt(process.env.MAX_VIDEO_SIZE_MB  || '100') * 1024 * 1024; // 100 MB
const MAX_AVATAR_SIZE = parseInt(process.env.MAX_AVATAR_SIZE_MB || '5')  * 1024 * 1024; // 5 MB

// Post media upload — supports 'files' array + optional 'thumbnail'
const uploadPostMedia = multer({
    storage: memStorage,
    fileFilter: mediaFilter,
    limits: { files: 11, fileSize: MAX_VIDEO_SIZE }, // 10 media + 1 thumbnail
}).fields([
    { name: 'files', maxCount: 10 },
    { name: 'thumbnail', maxCount: 1 },
]);

// Reel upload — 'files' = the video, 'thumbnail' = optional first-frame JPEG
const uploadReelMedia = multer({
    storage: memStorage,
    fileFilter: mediaFilter,
    limits: { files: 2, fileSize: MAX_VIDEO_SIZE },
}).fields([
    { name: 'files', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
]);

const uploadAvatar = multer({
    storage: memStorage,
    fileFilter: imageFilter,
    limits: { files: 1, fileSize: MAX_AVATAR_SIZE },
}).single('avatar');

const uploadStory = multer({
    storage: memStorage,
    fileFilter: mediaFilter,
    limits: { files: 1, fileSize: MAX_VIDEO_SIZE },
}).single('file');

const uploadMessageMedia = multer({
    storage: memStorage,
    fileFilter: mediaFilter,
    limits: { files: 1, fileSize: MAX_VIDEO_SIZE },
}).single('media');

module.exports = { uploadPostMedia, uploadReelMedia, uploadAvatar, uploadStory, uploadMessageMedia };
