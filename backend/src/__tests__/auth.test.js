require('./setup');

const request = require('supertest');
const { app } = require('../server');


const validUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password1',
    full_name: 'Test User',
};

describe('Auth API', () => {

    // ─── Register ─────────────────────────────────────────────────────────
    describe('POST /api/v1/auth/register', () => {
        it('should register a new user and return tokens', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send(validUser);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('accessToken');
            expect(res.body.data.user).toHaveProperty('username', validUser.username);
            // Refresh token should be in a cookie
            expect(res.headers['set-cookie']).toBeDefined();
        });

        it('should reject duplicate email', async () => {
            await request(app).post('/api/v1/auth/register').send(validUser);
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({ ...validUser, username: 'differentuser' });

            expect(res.statusCode).toBe(409);
            expect(res.body.success).toBe(false);
        });

        it('should reject duplicate username', async () => {
            await request(app).post('/api/v1/auth/register').send(validUser);
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({ ...validUser, email: 'other@example.com' });

            expect(res.statusCode).toBe(409);
        });

        it('should reject weak password (no number)', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({ ...validUser, password: 'OnlyLetters' });

            expect(res.statusCode).toBe(422);
        });

        it('should reject short username', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({ ...validUser, username: 'ab' });

            expect(res.statusCode).toBe(422);
        });
    });

    // ─── Login ────────────────────────────────────────────────────────────
    describe('POST /api/v1/auth/login', () => {
        beforeEach(async () => {
            await request(app).post('/api/v1/auth/register').send(validUser);
        });

        it('should login with email and return tokens', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ login: validUser.email, password: validUser.password });

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toHaveProperty('accessToken');
        });

        it('should login with username', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ login: validUser.username, password: validUser.password });

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toHaveProperty('accessToken');
        });

        it('should reject wrong password', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ login: validUser.email, password: 'WrongPass1' });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should reject non-existent user', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ login: 'nobody@example.com', password: 'Password1' });

            expect(res.statusCode).toBe(401);
        });
    });

    // ─── Refresh ──────────────────────────────────────────────────────────
    describe('POST /api/v1/auth/refresh', () => {
        it('should issue a new access token with valid refresh cookie', async () => {
            const registerRes = await request(app)
                .post('/api/v1/auth/register')
                .send(validUser);

            const cookies = registerRes.headers['set-cookie'];
            const res = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', cookies);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toHaveProperty('accessToken');
        });

        it('should reject missing refresh token', async () => {
            const res = await request(app).post('/api/v1/auth/refresh');
            expect(res.statusCode).toBe(401);
        });

        it('should reject tampered refresh token', async () => {
            const res = await request(app)
                .post('/api/v1/auth/refresh')
                .set('Cookie', ['refreshToken=totally.invalid.token']);
            expect(res.statusCode).toBe(401);
        });
    });

    // ─── Logout ───────────────────────────────────────────────────────────
    describe('POST /api/v1/auth/logout', () => {
        it('should logout and clear the refresh cookie', async () => {
            const registerRes = await request(app)
                .post('/api/v1/auth/register')
                .send(validUser);

            const { accessToken } = registerRes.body.data;
            const res = await request(app)
                .post('/api/v1/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.statusCode).toBe(204);
            // Cookie should be cleared
            const cookies = res.headers['set-cookie'] || [];
            const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
            expect(refreshCookie).toMatch(/expires=Thu, 01 Jan 1970/i);
        });

        it('should reject logout without auth token', async () => {
            const res = await request(app).post('/api/v1/auth/logout');
            expect(res.statusCode).toBe(401);
        });
    });

    // ─── Change Password ──────────────────────────────────────────────────
    describe('POST /api/v1/auth/change-password', () => {
        it('should change password with correct current password', async () => {
            const registerRes = await request(app)
                .post('/api/v1/auth/register')
                .send(validUser);
            const { accessToken } = registerRes.body.data;

            const res = await request(app)
                .post('/api/v1/auth/change-password')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ currentPassword: validUser.password, newPassword: 'NewPass123' });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should reject wrong current password', async () => {
            const registerRes = await request(app)
                .post('/api/v1/auth/register')
                .send(validUser);
            const { accessToken } = registerRes.body.data;

            const res = await request(app)
                .post('/api/v1/auth/change-password')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ currentPassword: 'WrongPass1', newPassword: 'NewPass123' });

            expect(res.statusCode).toBe(400);
        });
    });
});
