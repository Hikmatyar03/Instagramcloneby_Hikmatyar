import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiLockClosed } from 'react-icons/hi';
import { userAPI } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { getAvatarUrl } from '../../utils/media';
import toast from 'react-hot-toast';

/**
 * FollowListModal — shows paginated followers or following list for a profile.
 *
 * Props:
 *   type         — 'followers' | 'following'
 *   username     — profile username to fetch for
 *   isPrivate    — whether the profile is private
 *   canView      — whether the requesting user can see the list
 *   onClose      — close handler
 */
export default function FollowListModal({ type, username, isPrivate, canView, onClose }) {
    const { user: me } = useAuthStore();
    const qc = useQueryClient();

    const fetcher = ({ pageParam }) =>
        type === 'followers'
            ? userAPI.getFollowers(username, pageParam).then(r => r.data.data)
            : userAPI.getFollowing(username, pageParam).then(r => r.data.data);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = useInfiniteQuery({
        queryKey: ['follow-list', type, username],
        queryFn: fetcher,
        getNextPageParam: (last) => last.next_cursor || undefined,
        enabled: canView,
    });

    const followMutation = useMutation({
        mutationFn: (uname) => userAPI.follow(uname),
        onSuccess: (_, uname) => {
            qc.invalidateQueries(['follow-list', type, username]);
            toast.success(`Followed @${uname}`);
        },
        onError: (e) => toast.error(e.response?.data?.message || 'Error'),
    });

    const users = data?.pages.flatMap(p => (type === 'followers' ? p.followers : p.following)) ?? [];
    const title = type === 'followers' ? 'Followers' : 'Following';

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center"
                onClick={e => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 60, opacity: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    className="bg-surface-card rounded-t-2xl sm:rounded-2xl w-full max-w-md flex flex-col overflow-hidden"
                    style={{ maxHeight: '80vh' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border flex-shrink-0">
                        <h2 className="font-semibold text-base">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-full hover:bg-surface-hover transition-colors"
                            aria-label="Close"
                        >
                            <HiX className="w-5 h-5 text-text-muted" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Private account guard */}
                        {!canView ? (
                            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                <div className="w-16 h-16 rounded-full border-2 border-text-muted flex items-center justify-center mb-4">
                                    <HiLockClosed className="w-8 h-8 text-text-muted" />
                                </div>
                                <p className="font-semibold mb-1">This account is private</p>
                                <p className="text-sm text-text-secondary">
                                    Follow {username} to see their {title.toLowerCase()}.
                                </p>
                            </div>
                        ) : isLoading ? (
                            <div className="space-y-0">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                                        <div className="w-11 h-11 rounded-full skeleton flex-shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3.5 w-28 rounded skeleton" />
                                            <div className="h-3 w-20 rounded skeleton" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : isError ? (
                            <div className="text-center py-12 text-text-muted text-sm">
                                Failed to load. Try again.
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-12 text-text-muted text-sm">
                                No {title.toLowerCase()} yet.
                            </div>
                        ) : (
                            <>
                                {users.map((u) => {
                                    const isMe = me?._id === u?._id;
                                    return (
                                        <div key={u?._id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors">
                                            <Link
                                                to={`/${u?.username}`}
                                                onClick={onClose}
                                                className="flex items-center gap-3 flex-1 min-w-0"
                                            >
                                                {u?.avatar_url ? (
                                                    <img
                                                        src={getAvatarUrl(u.avatar_url)}
                                                        alt={u.username}
                                                        className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#f09433] to-[#bc1888] flex items-center justify-center text-white font-bold flex-shrink-0">
                                                        {u?.username?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold truncate leading-none">{u?.username}</p>
                                                    {u?.full_name && (
                                                        <p className="text-xs text-text-secondary truncate mt-0.5">{u.full_name}</p>
                                                    )}
                                                </div>
                                            </Link>

                                            {!isMe && (
                                                <button
                                                    onClick={() => followMutation.mutate(u.username)}
                                                    disabled={followMutation.isPending}
                                                    className="btn-primary text-xs px-3 py-1.5 flex-shrink-0"
                                                >
                                                    Follow
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Load more */}
                                {hasNextPage && (
                                    <div className="flex justify-center py-4">
                                        <button
                                            onClick={() => fetchNextPage()}
                                            disabled={isFetchingNextPage}
                                            className="text-sm text-[#0095f6] font-semibold hover:opacity-70 transition-opacity"
                                        >
                                            {isFetchingNextPage ? 'Loading…' : 'Load more'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
