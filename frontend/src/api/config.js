const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const DEFAULT_BACKEND_BASE_URL = 'https://instagramcloneby-hikmatyar.onrender.com';

const rawBaseUrl = trimTrailingSlash(
    import.meta.env.VITE_API_BASE_URL
    || import.meta.env.VITE_SOCKET_URL
    || DEFAULT_BACKEND_BASE_URL,
);

export const API_BASE_URL = /\/api\/v1$/i.test(rawBaseUrl)
    ? rawBaseUrl
    : `${rawBaseUrl}/api/v1`;

export const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/v1$/i, '');
export const SOCKET_URL = trimTrailingSlash(import.meta.env.VITE_SOCKET_URL || BACKEND_BASE_URL);
