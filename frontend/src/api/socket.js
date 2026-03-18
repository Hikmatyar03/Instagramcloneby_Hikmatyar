import { io } from 'socket.io-client';
import { SOCKET_URL } from './config';

let socket = null;

export const getSocket = () => socket;

export const connectSocket = (token) => {
    if (socket?.connected) return socket;

    socket = io(SOCKET_URL, {
        auth: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        withCredentials: true,
    });

    socket.on('connect', () => console.log('[Socket] Connected:', socket.id));
    socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
    socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
