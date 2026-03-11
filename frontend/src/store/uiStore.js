import { create } from 'zustand';

export const useNotifStore = create((set) => ({
    unreadCount: 0,
    setUnreadCount: (count) => set({ unreadCount: count }),
    incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
    resetUnread: () => set({ unreadCount: 0 }),
}));

export const useUIStore = create((set) => ({
    createModalOpen: false,
    searchOpen: false,
    activeNav: 'home',
    openCreateModal: () => set({ createModalOpen: true }),
    closeCreateModal: () => set({ createModalOpen: false }),
    setSearchOpen: (v) => set({ searchOpen: v }),
    setActiveNav: (nav) => set({ activeNav: nav }),
}));

// Track seen reels to avoid de-duplication in the same session
export const useReelStore = create((set) => ({
    seenReelIds: new Set(),
    markSeen: (id) => set((s) => ({ seenReelIds: new Set([...s.seenReelIds, id]) })),
    reset: () => set({ seenReelIds: new Set() }),
}));
