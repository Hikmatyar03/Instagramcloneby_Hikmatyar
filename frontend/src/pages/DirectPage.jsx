import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { messageAPI } from '../api/client';
import { getSocket } from '../api/socket';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { HiPaperAirplane, HiArrowLeft, HiPhotograph } from 'react-icons/hi';
import toast from 'react-hot-toast';

/* ─── Conversation list item ──────────────────────────────────────────────── */

function ConversationItem({ conv, isActive, onClick, currentUserId }) {
    const other = conv.type === 'direct'
        ? conv.participants?.find(p => p._id !== currentUserId)
        : null;
    const unread = conv.unread_counts?.find(u => u.user_id === currentUserId)?.count || 0;
    const name = other?.username || conv.name || 'Group';
    const avatar = other?.avatar_url;

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                isActive ? 'bg-surface-card' : 'hover:bg-surface-hover'
            }`}
        >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                {avatar ? (
                    <img src={avatar} className="w-14 h-14 rounded-full object-cover" alt="" />
                ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#f09433] to-[#bc1888] flex items-center justify-center text-white font-bold text-lg">
                        {name[0].toUpperCase()}
                    </div>
                )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${unread > 0 ? 'font-semibold text-text-primary' : 'font-normal text-text-primary'}`}>
                    {name}
                </p>
                {conv.last_message_preview && (
                    <p className="text-xs text-text-secondary truncate mt-0.5 max-w-[200px]">
                        {conv.last_message_preview}
                    </p>
                )}
            </div>

            {/* Unread dot */}
            {unread > 0 && (
                <span className="bg-[#0095f6] text-white text-[11px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 flex-shrink-0">
                    {unread}
                </span>
            )}
        </button>
    );
}

/* ─── Message bubble ──────────────────────────────────────────────────────── */

function MessageBubble({ msg, isMe, showAvatar, avatar, username }) {
    const isUnsent = msg.is_unsent;

    if (msg.message_type === 'post_share' && msg.shared_post_id) {
        return (
            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                <div className={`max-w-[260px] rounded-2xl overflow-hidden border ${
                    isMe ? 'border-[#E1306C]/30' : 'border-surface-border'
                }`}>
                    {msg.media_url && (
                        <img src={msg.media_url} className="w-full aspect-square object-cover" alt="shared post" />
                    )}
                    <div className={`px-3 py-1.5 text-xs ${isMe ? 'bg-[#E1306C]/20 text-text-secondary' : 'bg-surface-hover text-text-secondary'}`}>
                        📷 Shared a post
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-end gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar (for other person — only show when last in a group) */}
            {!isMe && (
                <div className="w-6 flex-shrink-0 mb-1">
                    {showAvatar ? (
                        avatar ? <img src={avatar} className="w-6 h-6 rounded-full object-cover" alt="" />
                              : <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#f09433] to-[#bc1888] flex items-center justify-center text-white text-[9px] font-bold">
                                    {username?.[0]?.toUpperCase()}
                                </div>
                    ) : null}
                </div>
            )}

            <div
                className={`max-w-[70%] px-4 py-2.5 text-sm leading-relaxed ${
                    isUnsent
                        ? 'italic text-text-muted'
                        : isMe
                        ? 'bg-[#0095f6] text-white rounded-[20px] rounded-br-[4px]'
                        : 'bg-surface-card text-text-primary rounded-[20px] rounded-bl-[4px]'
                }`}
            >
                {isUnsent ? 'This message was unsent' : msg.content}
                {msg.media_url && !msg.shared_post_id && (
                    <img src={msg.media_url} className="rounded-lg max-w-full mt-1" alt="" />
                )}
            </div>

            {isMe && msg.is_read && (
                <span className="text-[10px] text-text-muted self-end mb-0.5">Seen</span>
            )}
        </div>
    );
}

/* ─── Main DirectPage component ───────────────────────────────────────────── */

export default function DirectPage() {
    const { convId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [msgText, setMsgText] = useState('');
    const [activeConvId, setActiveConvId] = useState(convId || null);
    const [localMessages, setLocalMessages] = useState([]);
    const messagesEndRef = useRef(null);

    // ── Fetch conversation list ──
    const { data: convsData } = useQuery({
        queryKey: ['conversations'],
        queryFn: () => messageAPI.getConversations().then(r => r.data.data),
        refetchInterval: 15_000,
    });

    // ── Fetch messages for active conversation ──
    const { data: msgData } = useInfiniteQuery({
        queryKey: ['messages', activeConvId],
        queryFn: ({ pageParam }) => messageAPI.getMessages(activeConvId, pageParam).then(r => r.data.data),
        getNextPageParam: (last) => last.next_cursor || undefined,
        enabled: !!activeConvId,
    });

    // ── Socket.io — join / listen ──
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !activeConvId) return;
        socket.emit('join_conversation', activeConvId);
        socket.emit('mark_read', { conversationId: activeConvId });

        const handler = (msg) => setLocalMessages(prev => [...prev, msg]);
        socket.on('new_message', handler);
        return () => {
            socket.off('new_message', handler);
            socket.emit('leave_conversation', activeConvId);
        };
    }, [activeConvId]);

    // ── Auto-scroll ──
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [localMessages, msgData]);

    // ── Sync URL param ──
    useEffect(() => {
        if (convId && convId !== activeConvId) setActiveConvId(convId);
    }, [convId]);

    // ── Send message ──
    const sendMutation = useMutation({
        mutationFn: () => messageAPI.sendMessage(activeConvId, { message_type: 'text', content: msgText }),
        onSuccess: (r) => {
            setLocalMessages(prev => [...prev, r.data.data]);
            setMsgText('');
        },
        onError: (e) => {
            const code = e.response?.data?.error;
            if (code === 'ONE_MSG_LIMIT') {
                toast.error('Follow them back to keep messaging.');
            } else {
                toast.error(e.response?.data?.message || 'Failed to send');
            }
        },
    });

    const handleSend = (e) => {
        e.preventDefault();
        if (msgText.trim()) sendMutation.mutate();
    };

    const serverMessages = msgData?.pages.flatMap(p => p.messages).reverse() ?? [];
    const allMessages = [
        ...serverMessages,
        ...localMessages.filter(m => !serverMessages.find(s => s._id === m._id)),
    ];
    const conversations = convsData || [];
    const currentConv = conversations.find(c => c._id === activeConvId);
    const otherParticipant = currentConv?.type === 'direct'
        ? currentConv.participants?.find(p => p._id !== user?._id)
        : null;
    const convTitle = otherParticipant?.username || currentConv?.name || 'Conversation';
    const convAvatar = otherParticipant?.avatar_url;

    return (
        <div className="h-screen flex">
            {/* ─── Left: Conversations list ─── */}
            <aside className={`w-full max-w-[360px] border-r border-surface-border flex flex-col flex-shrink-0 ${activeConvId ? 'hidden lg:flex' : 'flex'}`}>
                <div className="px-5 py-4 border-b border-surface-border">
                    <h2 className="font-semibold text-base">{user?.username || 'Messages'}</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.length > 0 ? (
                        conversations.map(conv => (
                            <ConversationItem
                                key={conv._id}
                                conv={conv}
                                isActive={conv._id === activeConvId}
                                currentUserId={user?._id}
                                onClick={() => {
                                    setActiveConvId(conv._id);
                                    setLocalMessages([]);
                                    navigate(`/direct/${conv._id}`);
                                }}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
                            <div className="w-16 h-16 rounded-full border-2 border-text-muted flex items-center justify-center mb-4">
                                <HiPaperAirplane className="w-7 h-7 text-text-muted rotate-45" />
                            </div>
                            <p className="font-semibold mb-1">Your messages</p>
                            <p className="text-sm text-text-secondary">Send private photos and messages to a friend.</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* ─── Right: Chat thread ─── */}
            <div className={`flex-1 flex flex-col min-w-0 ${!activeConvId ? 'hidden lg:flex' : 'flex'}`}>
                {activeConvId && currentConv ? (
                    <>
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-surface-border flex items-center gap-3 flex-shrink-0">
                            <button onClick={() => { setActiveConvId(null); navigate('/direct'); }} className="lg:hidden text-text-primary mr-1">
                                <HiArrowLeft className="w-6 h-6" />
                            </button>
                            {convAvatar ? (
                                <img src={convAvatar} className="w-9 h-9 rounded-full object-cover" alt="" />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#f09433] to-[#bc1888] flex items-center justify-center text-white font-bold text-sm">
                                    {convTitle[0]?.toUpperCase()}
                                </div>
                            )}
                            <div>
                                <p className="font-semibold text-sm">{convTitle}</p>
                                {otherParticipant?.is_verified && (
                                    <span className="text-[#0095f6] text-xs">✓ Verified</span>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            {allMessages.map((msg, i) => {
                                const isMe = msg.sender_id === user?._id || msg.sender_id?._id === user?._id;
                                const nextMsg = allMessages[i + 1];
                                const isLastInGroup = !nextMsg || (nextMsg.sender_id !== msg.sender_id && nextMsg.sender_id?._id !== msg.sender_id?._id);
                                const senderData = msg.sender_id?.avatar_url ? msg.sender_id : otherParticipant;
                                return (
                                    <MessageBubble
                                        key={msg._id}
                                        msg={msg}
                                        isMe={isMe}
                                        showAvatar={!isMe && isLastInGroup}
                                        avatar={senderData?.avatar_url}
                                        username={senderData?.username}
                                    />
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input bar — fixed at bottom */}
                        <form
                            onSubmit={handleSend}
                            className="border-t border-surface-border px-4 py-3 flex items-center gap-3 flex-shrink-0 bg-surface-bg"
                        >
                            <button type="button" className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0">
                                <HiPhotograph className="w-6 h-6" />
                            </button>
                            <input
                                value={msgText}
                                onChange={e => setMsgText(e.target.value)}
                                onFocus={() => getSocket()?.emit('typing_start', { conversationId: activeConvId })}
                                onBlur={() => getSocket()?.emit('typing_stop', { conversationId: activeConvId })}
                                placeholder="Message..."
                                className="flex-1 bg-surface-card border border-surface-border rounded-[24px] px-4 py-2.5 text-sm focus:outline-none focus:border-[#0095f6] transition-colors"
                                maxLength={1000}
                            />
                            <button
                                type="submit"
                                disabled={!msgText.trim() || sendMutation.isPending}
                                className="text-[#0095f6] disabled:opacity-30 flex-shrink-0 p-1 hover:bg-surface-hover rounded-full transition-colors"
                            >
                                <HiPaperAirplane className="w-5 h-5 rotate-90" />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-text-secondary px-8">
                        <div className="w-20 h-20 rounded-full border-2 border-text-muted flex items-center justify-center mb-6">
                            <HiPaperAirplane className="w-10 h-10 text-text-muted rotate-45" />
                        </div>
                        <p className="text-xl font-semibold mb-2 text-text-primary">Your messages</p>
                        <p className="text-sm">Send private photos and messages to a friend or group.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
