import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiHome, HiSearch, HiFilm, HiMail, HiBell, HiPlusCircle, HiUser, HiMenu, HiGlobeAlt
} from 'react-icons/hi';
import { useAuthStore } from '../../store/authStore';
import { useUIStore, useNotifStore } from '../../store/uiStore';
import { authAPI } from '../../api/client';
import toast from 'react-hot-toast';
import CreatePostModal from '../post/CreatePostModal';
import SearchPanel from '../search/SearchPanel';

export default function AppLayout() {
    const { user, logout } = useAuthStore();
    const { createModalOpen, openCreateModal, closeCreateModal } = useUIStore();
    const { unreadCount } = useNotifStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarExpanded, setSidebarExpanded] = useState(true);

    const handleLogout = async () => {
        try {
            await authAPI.logout();
        } finally {
            logout();
            navigate('/');
        }
    };

    const navItems = [
        { path: '/feed', icon: HiHome, label: 'Home' },
        { path: '/explore', icon: HiGlobeAlt, label: 'Explore' },
        { path: '/reels', icon: HiFilm, label: 'Reels' },
        { path: '/direct', icon: HiMail, label: 'Messages' },
        { path: '/notifications', icon: HiBell, label: 'Notifications', badge: unreadCount },
        { path: `/${user?.username}`, icon: HiUser, label: 'Profile' },
    ];

    return (
        <div className="flex min-h-screen bg-surface">
            {/* ─── Left Sidebar (Desktop) ──────────────────── */}
            <aside className={`hidden lg:flex flex-col fixed left-0 top-0 h-full z-40 border-r border-surface-border bg-surface transition-all duration-200 ${sidebarExpanded ? 'w-60' : 'w-[72px]'}`}>
                {/* Logo */}
                <div className="px-4 py-6 mb-2">
                    {sidebarExpanded ? (
                        <span className="text-2xl font-bold gradient-text cursor-pointer" onClick={() => navigate('/feed')}>InstaClone</span>
                    ) : (
                        <span className="text-2xl cursor-pointer" onClick={() => navigate('/feed')}>📸</span>
                    )}
                </div>

                {/* Navigation items */}
                <nav className="flex-1 px-2 space-y-1">
                    {/* Search (panel trigger) */}
                    <button
                        onClick={() => useUIStore.getState().setSearchOpen(true)}
                        className="nav-icon w-full text-left"
                    >
                        <HiSearch className="w-6 h-6 flex-shrink-0" />
                        {sidebarExpanded && <span className="text-sm font-medium">Search</span>}
                    </button>

                    {navItems.map(({ path, icon: Icon, label, badge }) => (
                        <NavLink
                            key={path}
                            to={path}
                            className={({ isActive }) => `nav-icon ${isActive ? 'active' : ''}`}
                        >
                            <div className="relative">
                                <Icon className="w-6 h-6 flex-shrink-0" />
                                {badge > 0 && <span className="notif-dot">{badge > 9 ? '9+' : badge}</span>}
                            </div>
                            {sidebarExpanded && <span className="text-sm font-medium">{label}</span>}
                        </NavLink>
                    ))}

                    {/* Create */}
                    <button onClick={openCreateModal} className="nav-icon w-full text-left">
                        <HiPlusCircle className="w-6 h-6 flex-shrink-0" />
                        {sidebarExpanded && <span className="text-sm font-medium">Create</span>}
                    </button>
                </nav>

                {/* Collapse toggle */}
                <div className="px-2 pb-4 mt-auto">
                    <button
                        onClick={() => setSidebarExpanded(!sidebarExpanded)}
                        className="nav-icon w-full text-left text-text-secondary"
                    >
                        <HiMenu className="w-6 h-6 flex-shrink-0" />
                        {sidebarExpanded && <span className="text-sm">Collapse</span>}
                    </button>
                    {/* User avatar and Actions */}
                    {user && (
                        <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-hover cursor-pointer group">
                            <div className="flex items-center gap-3 overflow-hidden" onClick={() => navigate(`/${user.username}`)}>
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full shrink-0 bg-gradient-to-tr from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold">
                                        {user.username?.[0]?.toUpperCase()}
                                    </div>
                                )}
                                {sidebarExpanded && (
                                    <div className="flex-1 min-w-0 pr-2">
                                        <p className="text-sm font-semibold truncate">{user.username}</p>
                                        <p className="text-xs text-text-secondary truncate">{user.full_name}</p>
                                    </div>
                                )}
                            </div>
                            {sidebarExpanded && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                                    className="text-text-muted hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                                    title="Logout"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            {/* ─── Mobile Bottom Tab Bar ────────────────────── */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-surface-border bg-surface flex items-center justify-around px-2 py-2">
                {[
                    { path: '/feed', icon: HiHome },
                    { path: '/explore', icon: HiGlobeAlt },
                    { path: '/', icon: HiPlusCircle, action: openCreateModal },
                    { path: '/reels', icon: HiFilm },
                    { path: `/${user?.username}`, icon: HiUser },
                ].map(({ path, icon: Icon, action }) => (
                    <button
                        key={path}
                        onClick={() => (action ? action() : navigate(path))}
                        className={`p-2 rounded-xl transition-colors ${location.pathname === path ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
                    >
                        <Icon className="w-7 h-7" />
                    </button>
                ))}
            </nav>

            {/* ─── Main Content ─────────────────────────────── */}
            <main className={`flex-1 min-h-screen pb-20 lg:pb-0 ${sidebarExpanded ? 'lg:ml-60' : 'lg:ml-[72px]'} transition-all duration-200`}>
                <Outlet />
            </main>

            {/* Create Post Modal */}
            <AnimatePresence>
                {createModalOpen && <CreatePostModal onClose={closeCreateModal} />}
            </AnimatePresence>

            {/* Search Panel */}
            <SearchPanel />
        </div>
    );
}
