import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { connectSocket, disconnectSocket } from '../api/socket';
import { userAPI } from '../api/client';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            isAuthenticated: false,

            setAuth: (user, accessToken) => {
                localStorage.setItem('accessToken', accessToken);
                connectSocket(accessToken);
                set({ user, accessToken, isAuthenticated: true });
            },

            updateUser: (updates) => {
                set((state) => ({ user: { ...state.user, ...updates } }));
            },

            refreshUser: async () => {
                try {
                    const { data } = await userAPI.getMe();
                    set({ user: data.data });
                } catch { }
            },

            logout: () => {
                localStorage.removeItem('accessToken');
                disconnectSocket();
                set({ user: null, accessToken: null, isAuthenticated: false });
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
        },
    ),
);
