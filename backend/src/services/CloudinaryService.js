const cloudinary = require('cloudinary').v2;

// Configure from env. Support CLOUDINARY_URL or individual vars
if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
} else {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

const fs = require('fs');

const isConfigured = () => {
    return !!(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));
};

const uploadFile = async (filePath, options = {}) => {
    if (!isConfigured()) throw new Error('Cloudinary not configured');

    const opts = {
        resource_type: 'auto',
        folder: options.folder || 'instaclone',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
    };
    if (options.format) opts.format = options.format;
    const result = await cloudinary.uploader.upload(filePath, opts);

    // Remove local file after successful upload (best-effort)
    try { fs.unlinkSync(filePath); } catch (e) { }

    return result;
};

module.exports = { uploadFile, isConfigured };
