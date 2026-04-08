/**
 * getMediaUrl — resolves any stored URL or path to a full, usable URL.
 *
 * Priority handling:
 *  1. Full https:// URL (Cloudinary, CDN) → returned as-is, no prefix added
 *  2. Full http:// URL (local dev)         → returned as-is
 *  3. Relative path /uploads/...           → prepend BACKEND_BASE_URL
 *  4. Legacy double-prefix /uploads/uploads/... → fixed then prepended
 */
import { BACKEND_BASE_URL } from '../api/config';

const BASE = BACKEND_BASE_URL;

export const getMediaUrl = (filePath) => {
    if (!filePath) return null;

    // Already a full URL (Cloudinary, S3, etc.) — pass through unchanged
    if (filePath.startsWith('https://') || filePath.startsWith('http://')) return filePath;

    // Fix legacy double-prefix: /uploads/uploads/... → /uploads/...
    let normalized = filePath.replace(/^\/uploads\/uploads\//, '/uploads/');

    // Ensure leading slash
    if (!normalized.startsWith('/')) normalized = `/${normalized}`;

    // Ensure /uploads prefix is present for static files (local dev fallback)
    if (!normalized.startsWith('/uploads/')) {
        normalized = `/uploads${normalized}`;
    }

    return `${BASE}${normalized}`;
};

export const getAvatarUrl = (url) => {
    if (!url) return null;
    return getMediaUrl(url);
};
