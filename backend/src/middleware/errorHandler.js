/**
 * Centralized error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('[ERROR]', err.message, err.stack);

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'PAYLOAD_TOO_LARGE', message: 'File size exceeds the allowed limit' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ success: false, error: 'TOO_MANY_FILES', message: 'Too many files uploaded' });
    }

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
        const details = Object.fromEntries(
            Object.entries(err.errors).map(([k, v]) => [k, v.message])
        );
        return res.status(422).json({ success: false, error: 'VALIDATION_ERROR', message: 'Validation failed', details });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || 'field';
        return res.status(409).json({ success: false, error: 'CONFLICT', message: `${field} already exists` });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Invalid token' });
    }

    // Default
    const status = err.status || 500;
    res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    });
};

/**
 * 404 handler
 */
const notFound = (req, res) => {
    res.status(404).json({ success: false, error: 'NOT_FOUND', message: `Route ${req.originalUrl} not found` });
};

module.exports = { errorHandler, notFound };
