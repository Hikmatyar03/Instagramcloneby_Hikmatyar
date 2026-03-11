// Set env vars BEFORE requiring server (server.js calls connectDB() which calls mongoose.connect())
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/instaclone_test';
process.env.JWT_SECRET = 'test-jwt-secret-1234567890abcdef1234567890abcdef1234567890abcdef123456789012';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-1234567890abcdef1234567890abcdef1234567890abcdef1234';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_ROUNDS = '4';
process.env.UPLOAD_DIR = require('os').tmpdir();

const mongoose = require('mongoose');

// server.js calls connectDB() which calls mongoose.connect().
// We just wait for it and clean up between tests.
afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        try { await collections[key].deleteMany({}); } catch (_) { }
    }
});

afterAll(async () => {
    try {
        await mongoose.connection.dropDatabase();
    } catch (_) { }
});
