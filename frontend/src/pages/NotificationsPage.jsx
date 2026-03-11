import React from 'react';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import InfiniteScroll from 'react-infinite-scroll-component';
import { notifAPI, followRequestsAPI } from '../api/client';
import { formatDistanceToNow } from 'date-fns';
import { useNotifStore } from '../store/uiStore';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

function NotifItem({ notif }) {
    const actor = notif.from_user_id;
    const types = {
        like: 'liked your post.',
        comment: 'commented on your post.',
        follow: 'started following you.',
        follow_request: 'requested to follow you.',
        follow_accept: 'accepted your follow request.',
        mention: 'mentioned you.',
        story_reaction: 'reacted to your story.',
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-3 hover:bg-surface-hover border-b border-surface-border/50 ${!notif.is_read ? 'bg-surface-card/50' : ''}`}>
            <Link to={`/${actor?.username}`} className="flex-shrink-0">
                {actor?.avatar_url ? (
                    <img src={actor.avatar_url} className="w-10 h-10 rounded-full object-cover ring-1 ring-surface-border" alt={actor.username} />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold">
                        {actor?.username?.[0]?.toUpperCase()}
                    </div>
                )}
            </Link>

            <div className="flex-1 min-w-0">
                <p className="text-sm">
                    <Link to={`/${actor?.username}`} className="font-semibold">{actor?.username}</Link>
                    {' '}{types[notif.type] || notif.message}
                </p>
                <p className="text-xs text-text-muted mt-0.5">{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</p>
            </div>

            {notif.post_id?.media?.[0] && (
                <Link to={`/p/${notif.post_id._id}`} className="flex-shrink-0">
                    <img src={notif.post_id.media[0].thumbnail_url} className="w-10 h-10 object-cover rounded ring-1 ring-surface-border" alt="" />
                </Link>
            )}
        </div>
    );
}

function FollowRequestItem({ req }) {
    const qc = useQueryClient();
    const actor = req.follower_id;

    const acceptMut = useMutation({
        mutationFn: () => followRequestsAPI.accept(req._id),
        onSuccess: () => qc.invalidateQueries(['follow-requests']),
        onError: () => toast.error('Could not accept request'),
    });

    const rejectMut = useMutation({
        mutationFn: () => followRequestsAPI.reject(req._id),
        onSuccess: () => qc.invalidateQueries(['follow-requests']),
        onError: () => toast.error('Could not delete request'),
    });

    return (
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover border-b border-surface-border/50 bg-blue-500/5">
            <Link to={`/${actor?.username}`} className="flex-shrink-0">
                {actor?.avatar_url ? (
                    <img src={actor.avatar_url} className="w-10 h-10 rounded-full object-cover ring-1 ring-surface-border" alt={actor.username} />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold">
                        {actor?.username?.[0]?.toUpperCase()}
                    </div>
                )}
            </Link>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate hover:underline">
                    <Link to={`/${actor?.username}`}>{actor?.username}</Link>
                </p>
                <p className="text-xs text-text-muted truncate">{actor?.full_name || 'Requested to follow you'}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={() => acceptMut.mutate()}
                    disabled={acceptMut.isPending || rejectMut.isPending}
                    className="btn-primary text-xs px-4 py-1.5"
                >
                    Confirm
                </button>
                <button
                    onClick={() => rejectMut.mutate()}
                    disabled={acceptMut.isPending || rejectMut.isPending}
                    className="btn-secondary text-xs px-4 py-1.5"
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

export default function NotificationsPage() {
    const qc = useQueryClient();
    const { resetUnread } = useNotifStore();

    // Fetch notifications
    const { data: notifData, fetchNextPage, hasNextPage, isLoading: notifsLoading } = useInfiniteQuery({
        queryKey: ['notifications'],
        queryFn: ({ pageParam }) => notifAPI.getAll(pageParam).then(r => r.data.data),
        getNextPageParam: (last) => last.next_cursor || undefined,
        onSuccess: () => {
            notifAPI.markAllRead().then(() => resetUnread());
        },
    });

    // Fetch follow requests
    const { data: requestsData, isLoading: reqsLoading } = useQuery({
        queryKey: ['follow-requests'],
        queryFn: () => followRequestsAPI.getAll().then(r => r.data.data),
    });

    const notifications = notifData?.pages.flatMap(p => p.notifications) ?? [];
    const followRequests = requestsData || [];

    return (
        <div className="max-w-[600px] mx-auto">
            <div className="px-4 py-4 border-b border-surface-border bg-surface-background sticky top-0 z-10">
                <h1 className="font-semibold text-lg">Notifications</h1>
            </div>

            {notifsLoading || reqsLoading ? (
                <div className="space-y-0">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-surface-border/50 animate-pulse">
                            <div className="skeleton w-10 h-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="skeleton h-3 w-48 rounded" />
                                <div className="skeleton h-3 w-24 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Follow Requests Section */}
                    {followRequests.length > 0 && (
                        <div className="border-b-4 border-surface-border">
                            <div className="px-4 py-2 bg-surface-card">
                                <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Follow Requests ({followRequests.length})</h2>
                            </div>
                            {followRequests.map(req => (
                                <FollowRequestItem key={req._id} req={req} />
                            ))}
                        </div>
                    )}

                    {/* Regular Notifications Section */}
                    {notifications.length === 0 ? (
                        <div className="text-center py-20 text-text-secondary">
                            <p className="text-lg font-semibold">No notifications yet</p>
                            <p className="text-sm mt-1">When someone likes or comments on a post, you'll see it here.</p>
                        </div>
                    ) : (
                        <InfiniteScroll
                            dataLength={notifications.length}
                            next={fetchNextPage}
                            hasMore={!!hasNextPage}
                            loader={<div className="skeleton h-12 my-2 mx-4 rounded" />}
                        >
                            {notifications.map(n => <NotifItem key={n._id} notif={n} />)}
                        </InfiniteScroll>
                    )}
                </>
            )}
        </div>
    );
}
