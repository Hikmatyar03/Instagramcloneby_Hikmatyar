import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI, postAPI, messageAPI } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { HiOutlineCog, HiViewGrid, HiFilm, HiTag, HiChat } from 'react-icons/hi';
import toast from 'react-hot-toast';

const TABS = [
    { key: 'posts', label: 'Posts', icon: HiViewGrid },
    { key: 'reels', label: 'Reels', icon: HiFilm },
    { key: 'tagged', label: 'Tagged', icon: HiTag },
];

export default function ProfilePage() {
    const { username } = useParams();
    const { user: me } = useAuthStore();
    const [activeTab, setActiveTab] = useState('posts');
    const qc = useQueryClient();
    const navigate = useNavigate();

    const { data: profileData, isLoading } = useQuery({
        queryKey: ['profile', username],
        queryFn: () => userAPI.getProfile(username).then(r => r.data.data),
    });

    const { data: postsData } = useQuery({
        queryKey: ['user-posts', username, activeTab],
        queryFn: () => (activeTab === 'reels' ? userAPI.getUserReels(username) : userAPI.getUserPosts(username)).then(r => r.data.data),
        enabled: !!username,
    });

    const followMutation = useMutation({
        mutationFn: () => {
            if (profileData?.is_following) return userAPI.unfollow(username);
            if (profileData?.follow_status === 'pending') return userAPI.withdrawFollow(username);
            return userAPI.follow(username);
        },
        onSuccess: () => qc.invalidateQueries(['profile', username]),
        onError: (e) => toast.error(e.response?.data?.message || 'Error'),
    });

    const messageMutation = useMutation({
        mutationFn: () => messageAPI.startDM(profileData._id),
        onSuccess: (res) => navigate(`/direct/${res.data.data._id}`),
        onError: (e) => toast.error(e.response?.data?.message || 'Could not open conversation'),
    });

    if (isLoading) return (
        <div className="max-w-[935px] mx-auto px-4 py-12 animate-pulse space-y-6">
            <div className="flex gap-8">
                <div className="w-36 h-36 rounded-full skeleton" />
                <div className="flex-1 space-y-3">
                    <div className="skeleton h-6 w-48 rounded" />
                    <div className="skeleton h-4 w-64 rounded" />
                </div>
            </div>
        </div>
    );

    const profile = profileData;
    const isMe = me?._id === profile?._id || me?.username === username;

    return (
        <div className="max-w-[935px] mx-auto px-4 py-8">
            {/* ─── Profile Header ─────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-8 mb-8">
                {/* Avatar */}
                <div className="flex-shrink-0 flex justify-center">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.username} className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover ring-2 ring-surface-border" />
                    ) : (
                        <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white text-4xl font-bold">
                            {profile?.username?.[0]?.toUpperCase()}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-xl font-light">{profile?.username}</h1>
                        {profile?.is_verified && <span className="text-[#0095f6]">✓</span>}
                        {isMe ? (
                            <button onClick={() => navigate('/settings')} className="btn-secondary text-sm px-4 py-1.5">Edit profile</button>
                        ) : (
                            <>
                                <button
                                    onClick={() => followMutation.mutate()}
                                    className={`text-sm px-4 py-1.5 rounded-lg font-semibold transition-all ${
                                        profileData?.is_following
                                            ? 'btn-secondary'
                                            : profileData?.follow_status === 'pending'
                                            ? 'btn-secondary text-text-muted'
                                            : 'btn-primary'
                                    }`}
                                    disabled={followMutation.isPending}
                                >
                                    {followMutation.isPending
                                        ? '…'
                                        : profileData?.is_following
                                        ? 'Following'
                                        : profileData?.follow_status === 'pending'
                                        ? 'Requested ✕'
                                        : 'Follow'
                                    }
                                </button>
                                {/* Message button: always visible for public accounts, or when following private accounts */}
                                {(!profile?.is_private || profile?.is_following) && (
                                    <button
                                        onClick={() => messageMutation.mutate()}
                                        disabled={messageMutation.isPending}
                                        className="btn-secondary text-sm px-4 py-1.5 flex items-center gap-1.5"
                                    >
                                        <HiChat className="w-4 h-4" />
                                        Message
                                    </button>
                                )}
                            </>
                        )}
                        {isMe && <button className="p-1.5 text-text-primary hover:bg-surface-hover rounded-lg"><HiOutlineCog className="w-5 h-5" /></button>}
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6 text-sm">
                        {[
                            { label: 'posts', value: profile?.posts_count ?? 0 },
                            { label: 'followers', value: profile?.followers_count ?? 0 },
                            { label: 'following', value: profile?.following_count ?? 0 },
                        ].map(({ label, value }) => (
                            <div key={label} className="text-center sm:text-left">
                                <span className="font-semibold">{value.toLocaleString()}</span>
                                <span className="text-text-secondary ml-1">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Bio */}
                    <div>
                        {profile?.full_name && <p className="font-semibold text-sm">{profile.full_name}</p>}
                        {profile?.bio && <p className="text-sm text-text-primary whitespace-pre-wrap">{profile.bio}</p>}
                        {profile?.website && (
                            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[#0095f6] hover:underline">{profile.website}</a>
                        )}
                    </div>

                    {/* Private and not following */}
                    {profile?.is_private && profile?.is_private_and_not_following && !isMe && (
                        <p className="text-text-secondary text-sm">This account is private. Follow to see their posts.</p>
                    )}
                </div>
            </div>

            {/* ─── Tabs ────────────────────────────────────── */}
            <div className="border-t border-surface-border">
                <div className="flex justify-center gap-10">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-t-2 -mt-px ${activeTab === key ? 'border-text-primary text-text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Posts Grid ──────────────────────────────── */}
            {(!profile?.is_private || isMe || profile?.is_following) ? (
                <div className="grid grid-cols-3 gap-0.5 mt-0.5">
                    {(postsData?.posts || []).map(post => (
                        <Link key={post._id} to={`/p/${post._id}`} className="aspect-square overflow-hidden relative group bg-surface-muted">
                            <img
                                src={post.media?.[0]?.thumbnail_url || post.media?.[0]?.full_url}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {post.media?.length > 1 && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100">
                                    <HiGrid className="w-4 h-4 text-white drop-shadow" />
                                </div>
                            )}
                            {post.type === 'reel' && (
                                <div className="absolute top-2 right-2"><HiFilm className="w-4 h-4 text-white drop-shadow" /></div>
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity">
                                <span className="text-white font-bold text-sm">❤️ {post.likes_count}</span>
                                <span className="text-white font-bold text-sm">💬 {post.comments_count}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
