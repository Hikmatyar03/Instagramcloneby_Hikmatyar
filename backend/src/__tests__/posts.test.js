require('./setup');

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { app } = require('../server');


// Helper: register + login to get an access token
async function loginUser(userData = {}) {
    const user = {
        username: 'postuser',
        email: 'postuser@example.com',
        password: 'Password1',
        full_name: 'Post User',
        ...userData,
    };
    const res = await request(app).post('/api/v1/auth/register').send(user);
    return { token: res.body.data.accessToken, user: res.body.data.user };
}

describe('Posts API', () => {

    // ─── Create Post ──────────────────────────────────────────────────────
    describe('POST /api/v1/posts', () => {
        it('should create a post with a caption (no media)', async () => {
            const { token } = await loginUser();

            // Create a small 1x1 white PNG buffer to use as test image
            const pngBuffer = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
                'base64'
            );

            const res = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${token}`)
                .field('caption', 'Hello #world from tests!')
                .attach('files', pngBuffer, { filename: 'test.png', contentType: 'image/png' });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('_id');
            expect(res.body.data.caption).toBe('Hello #world from tests!');
            expect(res.body.data.hashtags).toContain('world');
        });

        it('should reject unauthenticated post creation', async () => {
            const res = await request(app)
                .post('/api/v1/posts')
                .field('caption', 'Unauthorized post');
            expect(res.statusCode).toBe(401);
        });
    });

    // ─── Get Post ─────────────────────────────────────────────────────────
    describe('GET /api/v1/posts/:id', () => {
        it('should fetch a created post by ID', async () => {
            const { token } = await loginUser();
            const pngBuffer = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
                'base64'
            );
            const createRes = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${token}`)
                .field('caption', 'Fetchable post')
                .attach('files', pngBuffer, { filename: 'img.png', contentType: 'image/png' });

            const postId = createRes.body.data._id;

            const res = await request(app)
                .get(`/api/v1/posts/${postId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data._id).toBe(postId);
            expect(res.body.data.caption).toBe('Fetchable post');
            expect(res.body.data).toHaveProperty('is_liked');
            expect(res.body.data).toHaveProperty('is_saved');
        });

        it('should return 404 for non-existent post', async () => {
            const { token } = await loginUser();
            const res = await request(app)
                .get('/api/v1/posts/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(404);
        });
    });

    // ─── Like / Unlike ────────────────────────────────────────────────────
    describe('POST /api/v1/posts/:id/like', () => {
        it('should like a post and increment like count', async () => {
            const { token } = await loginUser();
            const pngBuffer = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
                'base64'
            );
            const createRes = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${token}`)
                .field('caption', 'Likeable post')
                .attach('files', pngBuffer, { filename: 'img.png', contentType: 'image/png' });

            const postId = createRes.body.data._id;

            const likeRes = await request(app)
                .post(`/api/v1/posts/${postId}/like`)
                .set('Authorization', `Bearer ${token}`);

            expect(likeRes.statusCode).toBe(200);
            expect(likeRes.body.data.liked).toBe(true);
            expect(likeRes.body.data.likes_count).toBe(1);
        });

        it('should handle double-like gracefully (idempotent)', async () => {
            const { token } = await loginUser();
            const pngBuffer = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
                'base64'
            );
            const createRes = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${token}`)
                .field('caption', 'Double like test')
                .attach('files', pngBuffer, { filename: 'img.png', contentType: 'image/png' });

            const postId = createRes.body.data._id;
            await request(app).post(`/api/v1/posts/${postId}/like`).set('Authorization', `Bearer ${token}`);
            const res = await request(app).post(`/api/v1/posts/${postId}/like`).set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200); // Should not throw
            expect(res.body.data.liked).toBe(true);
        });
    });

    // ─── Save / Unsave ────────────────────────────────────────────────────
    describe('POST /api/v1/posts/:id/save', () => {
        it('should save a post', async () => {
            const { token } = await loginUser();
            const pngBuffer = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
                'base64'
            );
            const createRes = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${token}`)
                .field('caption', 'Saveable post')
                .attach('files', pngBuffer, { filename: 'img.png', contentType: 'image/png' });

            const postId = createRes.body.data._id;

            const saveRes = await request(app)
                .post(`/api/v1/posts/${postId}/save`)
                .set('Authorization', `Bearer ${token}`)
                .send({ collection_name: 'Favorites' });

            expect(saveRes.statusCode).toBe(201);
            expect(saveRes.body.success).toBe(true);
        });

        it('should return 404 when saving a non-existent post', async () => {
            const { token } = await loginUser();
            const res = await request(app)
                .post('/api/v1/posts/000000000000000000000000/save')
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.statusCode).toBe(404);
        });
    });

    // ─── Edit Post ────────────────────────────────────────────────────────
    describe('PATCH /api/v1/posts/:id', () => {
        it('should edit caption of own post', async () => {
            const { token } = await loginUser();
            const pngBuffer = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
                'base64'
            );
            const createRes = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${token}`)
                .field('caption', 'Old caption')
                .attach('files', pngBuffer, { filename: 'img.png', contentType: 'image/png' });

            const postId = createRes.body.data._id;

            const editRes = await request(app)
                .patch(`/api/v1/posts/${postId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ caption: 'New caption #updated' });

            expect(editRes.statusCode).toBe(200);
            expect(editRes.body.data.caption).toBe('New caption #updated');
            expect(editRes.body.data.hashtags).toContain('updated');
        });
    });

    // ─── Delete Post ──────────────────────────────────────────────────────
    describe('DELETE /api/v1/posts/:id', () => {
        it('should soft-delete a post (is_deleted=true)', async () => {
            const { token } = await loginUser();
            const pngBuffer = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
                'base64'
            );
            const createRes = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${token}`)
                .field('caption', 'Deleteable post')
                .attach('files', pngBuffer, { filename: 'img.png', contentType: 'image/png' });

            const postId = createRes.body.data._id;

            const deleteRes = await request(app)
                .delete(`/api/v1/posts/${postId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(deleteRes.statusCode).toBe(204);

            // Should 404 now
            const fetchRes = await request(app)
                .get(`/api/v1/posts/${postId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(fetchRes.statusCode).toBe(404);
        });

        it('should not allow deleting another user\'s post', async () => {
            const { token: ownerToken } = await loginUser();
            const { token: otherToken } = await loginUser({ username: 'otheruser', email: 'other@test.com' });

            const pngBuffer = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
                'base64'
            );
            const createRes = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${ownerToken}`)
                .field('caption', 'Owner post')
                .attach('files', pngBuffer, { filename: 'img.png', contentType: 'image/png' });

            const postId = createRes.body.data._id;

            const deleteRes = await request(app)
                .delete(`/api/v1/posts/${postId}`)
                .set('Authorization', `Bearer ${otherToken}`);

            expect(deleteRes.statusCode).toBe(404); // Ownership check returns 404
        });
    });

    // ─── Comments ─────────────────────────────────────────────────────────
    describe('POST /api/v1/posts/:id/comments', () => {
        it('should add a comment to a post', async () => {
            const { token } = await loginUser();
            const pngBuffer = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
                'base64'
            );
            const createRes = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${token}`)
                .field('caption', 'Comment test post')
                .attach('files', pngBuffer, { filename: 'img.png', contentType: 'image/png' });

            const postId = createRes.body.data._id;

            const commentRes = await request(app)
                .post(`/api/v1/posts/${postId}/comments`)
                .set('Authorization', `Bearer ${token}`)
                .send({ text: 'Great post!' });

            expect(commentRes.statusCode).toBe(201);
            expect(commentRes.body.data.text).toBe('Great post!');
        });
    });
});
