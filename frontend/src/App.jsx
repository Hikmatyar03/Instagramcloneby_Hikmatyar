import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { connectSocket } from './api/socket';
import { useNotifStore } from './store/uiStore';
import { getSocket } from './api/socket';
import { notifAPI } from './api/client';

// Lazy-load pages for performance
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignupPage = React.lazy(() => import('./pages/SignupPage'));
const FeedPage = React.lazy(() => import('./pages/FeedPage'));
const ExplorePage = React.lazy(() => import('./pages/ExplorePage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const PostDetailPage = React.lazy(() => import('./pages/PostDetailPage'));
const ReelPage = React.lazy(() => import('./pages/ReelPage'));
const ReelsFeedPage = React.lazy(() => import('./pages/ReelsFeedPage'));
const DirectPage = React.lazy(() => import('./pages/DirectPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const StoryViewerPage = React.lazy(() => import('./pages/StoryViewerPage'));
const LivePage = React.lazy(() => import('./pages/LivePage'));
const HashtagPage = React.lazy(() => import('./pages/HashtagPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));

function App() {
    const { isAuthenticated, accessToken } = useAuthStore();
    const { incrementUnread, setUnreadCount } = useNotifStore();

    // Connect socket and bind real-time events on login
    useEffect(() => {
        if (isAuthenticated && accessToken) {
            const socket = connectSocket(accessToken);
            socket.on('notification', () => incrementUnread());

            // Populate badge from server on every page load/refresh
            notifAPI.getUnreadCount()
                .then(r => setUnreadCount(r.data.data.count))
                .catch(() => {});
        }
    }, [isAuthenticated, accessToken]);

    return (
        <BrowserRouter>
            <React.Suspense fallback={
                <div className="flex items-center justify-center h-screen bg-surface">
                    <div className="w-10 h-10 border-2 border-surface-muted border-t-[#0095f6] rounded-full animate-spin" />
                </div>
            }>
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element={isAuthenticated ? <Navigate to="/feed" replace /> : <LoginPage />} />
                    <Route path="/signup" element={isAuthenticated ? <Navigate to="/feed" replace /> : <SignupPage />} />

                    {/* Protected routes wrapped in AppLayout (sidebar + nav) */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<AppLayout />}>
                            <Route path="/feed" element={<FeedPage />} />
                            <Route path="/explore" element={<ExplorePage />} />
                            <Route path="/reels" element={<ReelsFeedPage />} />
                            <Route path="/direct" element={<DirectPage />} />
                            <Route path="/direct/:convId" element={<DirectPage />} />
                            <Route path="/notifications" element={<NotificationsPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="/settings/:tab" element={<SettingsPage />} />
                            <Route path="/p/:postId" element={<PostDetailPage />} />
                            <Route path="/hashtag/:tag" element={<HashtagPage />} />
                            <Route path="/:username" element={<ProfilePage />} />
                        </Route>

                        {/* Full-screen pages without layout */}
                        <Route path="/reel/:reelId" element={<ReelPage />} />
                        <Route path="/stories/:userId/:storyId" element={<StoryViewerPage />} />
                        <Route path="/live/:streamId" element={<LivePage />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </React.Suspense>
        </BrowserRouter>
    );
}

export default App;
