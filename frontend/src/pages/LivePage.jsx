import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { liveAPI } from '../api/client';
import { getSocket } from '../api/socket';
import { useAuthStore } from '../store/authStore';
import { HiX, HiChat, HiEyeOutline, HiEye } from 'react-icons/hi';

export default function LivePage() {
    const { streamId } = useParams();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [viewerCount, setViewerCount] = useState(0);
    const [comments, setComments] = useState([]);
    const [msgText, setMsgText] = useState('');
    const chatRef = useRef(null);

    const { data: streamData } = useQuery({
        queryKey: ['live', streamId],
        queryFn: () => liveAPI.get(streamId).then(r => r.data.data),
    });

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        socket.emit('join_live', { streamId });
        socket.on('viewer_count', ({ count }) => setViewerCount(count));
        socket.on('live_comment', ({ comment }) => {
            setComments(prev => [...prev.slice(-99), comment]);
            chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
        });

        return () => {
            socket.emit('leave_live', { streamId });
            socket.off('viewer_count');
            socket.off('live_comment');
        };
    }, [streamId]);

    const sendComment = (e) => {
        e.preventDefault();
        if (!msgText.trim()) return;
        const socket = getSocket();
        socket?.emit('live_comment', { streamId, text: msgText.trim() });
        setMsgText('');
    };

    const broadcaster = streamData?.user_id;
    const isOwn = broadcaster?._id === user?._id || broadcaster === user?._id;

    return (
        <div className="fixed inset-0 bg-black z-50 flex">
            {/* Video area */}
            <div className="flex-1 relative">
                {/* Live badge + info */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">LIVE</span>
                    <div className="flex items-center gap-1 text-white text-sm">
                        <HiEye className="w-4 h-4" />
                        <span>{viewerCount}</span>
                    </div>
                </div>

                {/* Close */}
                <button onClick={() => navigate(-1)} className="absolute top-4 right-4 z-10 text-white bg-black/40 rounded-full p-2">
                    <HiX className="w-6 h-6" />
                </button>

                {/* Placeholder for actual WebRTC video element */}
                <div className="w-full h-full bg-surface-card flex items-center justify-center">
                    <div className="text-center text-text-secondary">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                            {broadcaster?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <p className="font-semibold text-text-primary">{broadcaster?.username}</p>
                        <p className="text-sm mt-1">Live broadcast</p>
                    </div>
                </div>

                {/* End stream (for owner) */}
                {isOwn && (
                    <button
                        onClick={async () => { await liveAPI.end(streamId); navigate(-1); }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2 rounded-lg"
                    >
                        End Live
                    </button>
                )}
            </div>

            {/* Chat panel */}
            <div className="w-72 flex flex-col border-l border-surface-border bg-surface/95">
                <div className="px-4 py-3 border-b border-surface-border">
                    <p className="font-semibold text-sm">Live Chat</p>
                </div>

                <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                    {comments.map((c, i) => (
                        <div key={i} className="text-xs">
                            <span className="font-semibold text-text-primary">{c.username} </span>
                            <span className="text-text-secondary">{c.text}</span>
                        </div>
                    ))}
                </div>

                <form onSubmit={sendComment} className="p-3 border-t border-surface-border flex gap-2">
                    <input value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Send a message..."
                        className="flex-1 bg-surface-card border border-surface-border rounded-2xl px-3 py-1.5 text-xs focus:outline-none" />
                    <button type="submit" className="text-[#0095f6] font-semibold text-xs">Send</button>
                </form>
            </div>
        </div>
    );
}
