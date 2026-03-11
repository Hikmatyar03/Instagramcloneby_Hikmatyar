const { validationResult } = require('express-validator');

/**
 * Middleware: Run express-validator checks and return 422 on failure
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const details = {};
        errors.array().forEach(e => { details[e.path] = e.msg; });
        return res.status(422).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details,
        });
    }
    next();
};

module.exports = { validate };
