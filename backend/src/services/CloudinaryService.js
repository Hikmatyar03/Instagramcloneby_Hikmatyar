const cloudinary = require('cloudinary').v2;
const { PassThrough } = require('stream');

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

/**
 * Call this once at server startup. Throws if Cloudinary env vars are not set.
 */
const verifyConfig = () => {
    const configured = !!(
        process.env.CLOUDINARY_URL ||
        (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
    );
    if (!configured) {
        throw new Error(
            '[Cloudinary] FATAL: Missing configuration. ' +
            'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (or CLOUDINARY_URL) ' +
            'as environment variables on Render before deploying.'
        );
    }
};

const isConfigured = () => {
    return !!(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));
};

/**
 * Upload an in-memory buffer to Cloudinary using upload_stream.
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {object} options - folder, resource_type, format, etc.
 * @returns {Promise<object>} Cloudinary upload result
 */
const uploadBuffer = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const opts = {
            resource_type: options.resource_type || 'auto',
            folder: options.folder || 'instaclone',
            use_filename: false,
            unique_filename: true,
            overwrite: false,
        };
        if (options.format) opts.format = options.format;
        if (options.transformation) opts.transformation = options.transformation;

        const uploadStream = cloudinary.uploader.upload_stream(opts, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });

        const pt = new PassThrough();
        pt.end(buffer);
        pt.pipe(uploadStream);
    });
};

/**
 * Upload a local file path to Cloudinary (kept for backward compat).
 * Prefer uploadBuffer() when using multer memoryStorage.
 */
const uploadFile = async (filePath, options = {}) => {
    const fs = require('fs');
    const buffer = fs.readFileSync(filePath);
    const result = await uploadBuffer(buffer, options);
    // Best-effort cleanup of temp file
    try { fs.unlinkSync(filePath); } catch (e) { }
    return result;
};

const deleteResource = async (publicId, resourceType = 'image') => {
    if (!isConfigured()) return;
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (e) {
        console.error('[Cloudinary] delete error', e.message);
    }
};

module.exports = { uploadBuffer, uploadFile, isConfigured, verifyConfig, deleteResource };
