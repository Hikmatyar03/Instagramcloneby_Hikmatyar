/**
 * getMediaUrl — resolves any stored URL or path to a full, usable URL.
 *
 * Handles all 3 data formats found in the DB:
 *   1. Already a full URL:      'http://localhost:5000/uploads/...'  → returned as-is
 *   2. Legacy double prefix:    '/uploads/uploads/posts/...'         → fixed to '/uploads/posts/...'
 *   3. Correct single prefix:   '/uploads/posts/...'                 → base + path
 *   4. Missing /uploads prefix: '/posts/...'                         → base + '/uploads' + path
 */
const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1')
    .replace('/api/v1', '');

export const getMediaUrl = (filePath) => {
    if (!filePath) return null;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;

    // Fix legacy double-prefix: /uploads/uploads/... → /uploads/...
    let normalized = filePath.replace(/^\/uploads\/uploads\//, '/uploads/');

    // Ensure leading slash
    if (!normalized.startsWith('/')) normalized = `/${normalized}`;

    // Ensure /uploads prefix is present for static files
    if (!normalized.startsWith('/uploads/')) {
        normalized = `/uploads${normalized}`;
    }

    return `${BASE}${normalized}`;
};

export const getAvatarUrl = (url) => {
    if (!url) return null;
    return getMediaUrl(url);
};

