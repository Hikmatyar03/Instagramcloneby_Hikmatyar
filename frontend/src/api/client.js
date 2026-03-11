import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'https://instagramcloneby-hikmatyar.onrender.com/api/v1',
    withCredentials: true,
    timeout: 30000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 401 — attempt token refresh automatically
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
    failedQueue = [];
};

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry && error.response?.data?.error !== 'UNAUTHORIZED') {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    original.headers.Authorization = `Bearer ${token}`;
                    return api(original);
                });
            }

            original._retry = true;
            isRefreshing = true;

            try {
                const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/auth/refresh`, {}, { withCredentials: true });
                const newToken = data.data.accessToken;
                localStorage.setItem('accessToken', newToken);
                processQueue(null, newToken);
                original.headers.Authorization = `Bearer ${newToken}`;
                return api(original);
            } catch (e) {
                processQueue(e, null);
                localStorage.removeItem('accessToken');
                window.location.href = '/';
                return Promise.reject(e);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    },
);

export default api;

// Typed API helpers
export const authAPI = {
    register: (data) => api.post("/auth/register", data),
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (data) => api.post('/auth/reset-password', data),
    changePassword: (data) => api.post('/auth/change-password', data),
};

export const userAPI = {
    getMe: () => api.get('/users/me'),
    updateMe: (data) => api.patch('/users/me', data),
    uploadAvatar: (formData) => api.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    deleteAvatar: () => api.delete('/users/me/avatar'),
    getSaved: (cursor) => api.get('/users/me/saved', { params: { cursor } }),
    getProfile: (username) => api.get(`/users/${username}`),
    getUserPosts: (username, cursor) => api.get(`/users/${username}/posts`, { params: { cursor } }),
    getUserReels: (username, cursor) => api.get(`/users/${username}/reels`, { params: { cursor } }),
    getFollowers: (username, cursor) => api.get(`/users/${username}/followers`, { params: { cursor } }),
    getFollowing: (username, cursor) => api.get(`/users/${username}/following`, { params: { cursor } }),
    search: (q) => api.get('/users/search', { params: { q } }),
    getSuggested: () => api.get('/users/suggested'),
    follow: (username) => api.post(`/users/${username}/follow`),
    unfollow: (username) => api.delete(`/users/${username}/follow`),
    withdrawFollow: (username) => api.delete(`/users/${username}/follow-request`), // cancel pending request
    getFollowStatus: (username) => api.get(`/users/${username}/follow-status`),
    updateNotifSettings: (data) => api.patch('/users/me/notification-settings', data),
};

export const shareAPI = {
    sharePost: (postId, recipientId) => api.post('/share', { postId, recipientId }),
};

export const postAPI = {
    create: (formData) => api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    get: (id) => api.get(`/posts/${id}`),
    edit: (id, data) => api.patch(`/posts/${id}`, data),
    delete: (id) => api.delete(`/posts/${id}`),
    getFeed: (cursor) => api.get('/posts/feed', { params: { cursor } }),
    getExplore: (cursor, type) => api.get('/posts/explore', { params: { cursor, type } }),
    like: (id) => api.post(`/posts/${id}/like`),
    unlike: (id) => api.delete(`/posts/${id}/like`),
    save: (id, collection_name) => api.post(`/posts/${id}/save`, { collection_name }),
    unsave: (id) => api.delete(`/posts/${id}/save`),
    getComments: (id, cursor) => api.get(`/posts/${id}/comments`, { params: { cursor } }),
    addComment: (id, text) => api.post(`/posts/${id}/comments`, { text }),
};

export const storyAPI = {
    create: (formData) => api.post('/stories', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    getFeed: () => api.get('/stories/feed'),
    get: (id) => api.get(`/stories/${id}`),
    delete: (id) => api.delete(`/stories/${id}`),
    view: (id) => api.post(`/stories/${id}/view`),
    react: (id, emoji) => api.post(`/stories/${id}/react`, { emoji }),
    getHighlights: (userId) => api.get(`/highlights/${userId}`),
    createHighlight: (data) => api.post('/highlights', data),
};

export const reelsAPI = {
    getFeed: (cursor) => api.get('/reels/feed', { params: { cursor } }),
    get: (id) => api.get(`/reels/${id}`),
    create: (formData) => api.post('/reels', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const messageAPI = {
    getConversations: () => api.get('/conversations'),
    startDM: (participant_id) => api.post('/conversations', { participant_id }),
    createGroup: (data) => api.post('/conversations/group', data),
    getMessages: (convId, before) => api.get(`/conversations/${convId}/messages`, { params: { before } }),
    sendMessage: (convId, data) => api.post(`/conversations/${convId}/messages`, data),
    unsend: (msgId) => api.post(`/messages/${msgId}/unsend`),
    react: (msgId, emoji) => api.post(`/messages/${msgId}/react`, { emoji }),
};

export const notifAPI = {
    getAll: (cursor) => api.get('/notifications', { params: { cursor } }),
    getUnreadCount: () => api.get('/notifications/unread-count'),
    markAllRead: () => api.patch('/notifications/read-all'),
    markRead: (id) => api.patch(`/notifications/${id}/read`),
    delete: (id) => api.delete(`/notifications/${id}`),
};

export const searchAPI = {
    search: (q) => api.get('/search', { params: { q } }),
    getHashtag: (tag) => api.get(`/search/${tag}`),
    getHashtagPosts: (tag, cursor) => api.get(`/search/${tag}/posts`, { params: { cursor } }),
    getTrending: () => api.get('/search/trending'),
};

export const liveAPI = {
    start: (data) => api.post('/live/start', data),
    end: (streamId) => api.post(`/live/${streamId}/end`),
    get: (streamId) => api.get(`/live/${streamId}`),
    getActive: () => api.get('/live/active'),
};

export const followRequestsAPI = {
    getAll: () => api.get('/follow-requests'),
    accept: (id) => api.post(`/follow-requests/${id}/accept`),
    reject: (id) => api.delete(`/follow-requests/${id}/reject`),
};
