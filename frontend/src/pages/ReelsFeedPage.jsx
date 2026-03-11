import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { reelsAPI, postAPI } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    HiHeart, HiOutlineHeart, HiChat, HiVolumeOff, HiVolumeUp,
    HiDotsHorizontal, HiShare,
} from 'react-icons/hi';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

/* ─── Single Reel Item ────────────────────────────────────────────────────── */

function ReelItem({ reel, isActive }) {
    const videoRef = useRef(null);
    const [muted, setMuted] = useState(true);
    const [liked, setLiked] = useState(reel.is_liked || false);
    const [likesCount, setLikesCount] = useState(reel.likes_count || 0);
    const [captionExpanded, setCaptionExpanded] = useState(false);
    const navigate = useNavigate();

    // Auto-play / pause based on scroll visibility
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (isActive) {
            video.play().catch(() => {});
        } else {
            video.pause();
            video.currentTime = 0;
        }
    }, [isActive]);

    const handleLike = async () => {
        setLiked(prev => !prev);
        setLikesCount(c => c + (liked ? -1 : 1));
        try {
            if (liked) await postAPI.unlike(reel._id);
            else await postAPI.like(reel._id);
        } catch {
            setLiked(liked);
            setLikesCount(c => c + (liked ? 1 : -1));
        }
    };

    const handleShare = async () => {
        const reelUrl = `${window.location.origin}/reel/${reel._id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Reel by @${reel.user_id?.username}`,
                    url: reelUrl,
                });
            } catch { /* user cancelled */ }
        } else {
            // Fallback: copy link to clipboard
            try {
                await navigator.clipboard.writeText(reelUrl);
                toast.success('Link copied to clipboard!');
            } catch {
                toast.error('Could not copy link');
            }
        }
    };

    const author = reel.user_id;
    const mediaUrl = reel.media?.[0]?.full_url || reel.media?.[0]?.hls_url;

    return (
        <div className="reel-container">
            {/* Thumbnail shown while video loads */}
            {(reel.media?.[0]?.thumbnail_url) && (
                <img
                    className="reel-thumb"
                    src={reel.media[0].thumbnail_url}
                    alt=""
                    style={{ zIndex: 0 }}
                />
            )}
            {/* Video */}
            {mediaUrl ? (
                <video
                    ref={videoRef}
                    src={mediaUrl}
                    loop
                    playsInline
                    muted={muted}
                    onClick={() => setMuted(m => !m)}
                    style={{ zIndex: 1 }}
                />
            ) : (
                <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center" style={{ zIndex: 1 }}>
                    <p className="text-white/40 text-sm">Video unavailable</p>
                </div>
            )}
            <div className="reel-overlay" style={{ zIndex: 2 }} />

            {/* Top — mute indicator */}
            <button
                onClick={() => setMuted(m => !m)}
                className="absolute top-4 right-4 bg-black/40 rounded-full p-2 text-white z-10"
            >
                {muted ? <HiVolumeOff className="w-5 h-5" /> : <HiVolumeUp className="w-5 h-5" />}
            </button>

            {/* Right Action Bar */}
            <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5 z-10">
                {/* Author avatar */}
                <button onClick={() => navigate(`/${author?.username}`)}>
                    <div className="w-11 h-11 rounded-full ring-2 ring-white overflow-hidden bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold">
                        {author?.avatar_url
                            ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                            : author?.username?.[0]?.toUpperCase()
                        }
                    </div>
                </button>

                {/* Like */}
                <div className="flex flex-col items-center gap-0.5">
                    <button onClick={handleLike} className="p-1">
                        {liked
                            ? <HiHeart className="w-8 h-8 text-red-500 drop-shadow" />
                            : <HiOutlineHeart className="w-8 h-8 text-white drop-shadow" />
                        }
                    </button>
                    <span className="text-white text-xs font-medium drop-shadow">{likesCount.toLocaleString()}</span>
                </div>

                {/* Comment */}
                <div className="flex flex-col items-center gap-0.5">
                    <button onClick={() => navigate(`/p/${reel._id}`)} className="p-1">
                        <HiChat className="w-8 h-8 text-white drop-shadow" />
                    </button>
                    <span className="text-white text-xs font-medium drop-shadow">{reel.comments_count || 0}</span>
                </div>

                {/* Share */}
                <button className="p-1" onClick={handleShare}>
                    <HiShare className="w-7 h-7 text-white drop-shadow" />
                </button>

                {/* More */}
                <button className="p-1">
                    <HiDotsHorizontal className="w-6 h-6 text-white drop-shadow" />
                </button>
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-6 left-4 right-16 z-10">
                <Link to={`/${author?.username}`} className="flex items-center gap-2 mb-2">
                    <span className="text-white font-semibold text-sm drop-shadow">@{author?.username}</span>
                    {author?.is_verified && <span className="text-[#0095f6] text-xs">✓</span>}
                </Link>
                {reel.caption && (
                    <p
                        className={`text-white text-sm leading-relaxed drop-shadow cursor-pointer ${captionExpanded ? '' : 'line-clamp-2'}`}
                        onClick={() => setCaptionExpanded(e => !e)}
                    >
                        {reel.caption}
                        {!captionExpanded && reel.caption.length > 80 && (
                            <span className="text-white/60 ml-1">more</span>
                        )}
                    </p>
                )}
            </div>
        </div>
    );
}

/* ─── Reels Feed Page ─────────────────────────────────────────────────────── */

export default function ReelsFeedPage() {
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef(null);
    const itemRefs = useRef([]);

    const { data, fetchNextPage, hasNextPage, isLoading, isError } = useInfiniteQuery({
        queryKey: ['reels-feed'],
        queryFn: ({ pageParam }) => reelsAPI.getFeed(pageParam).then(r => r.data.data),
        getNextPageParam: (last) => last.next_cursor || undefined,
    });

    const reels = data?.pages.flatMap(p => p.reels) ?? [];

    // IntersectionObserver to detect which reel is in view
    useEffect(() => {
        if (reels.length === 0) return;
        const observers = [];

        itemRefs.current.forEach((el, index) => {
            if (!el) return;
            const obs = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setActiveIndex(index);
                        // Load next page when 3 from the end
                        if (index >= reels.length - 3 && hasNextPage) {
                            fetchNextPage();
                        }
                    }
                },
                { threshold: 0.6 },
            );
            obs.observe(el);
            observers.push(obs);
        });

        return () => observers.forEach(o => o.disconnect());
    }, [reels.length, hasNextPage, fetchNextPage]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (isError || reels.length === 0) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center text-center px-6">
                <div>
                    <p className="text-white text-2xl font-semibold mb-2">🎬 No Reels Yet</p>
                    <p className="text-white/50 text-sm">Upload a reel to get started. Reels from all users will appear here.</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 overflow-y-scroll snap-y snap-mandatory bg-black"
            style={{ scrollbarWidth: 'none' }}
        >
            {reels.map((reel, index) => (
                <div
                    key={reel._id}
                    ref={el => { itemRefs.current[index] = el; }}
                    className="w-full h-screen snap-start snap-always flex-shrink-0 relative overflow-hidden"
                >
                    <ReelItem reel={reel} isActive={index === activeIndex} />
                </div>
            ))}

            {/* Loading more indicator */}
            {hasNextPage && (
                <div className="w-full h-20 snap-start flex items-center justify-center bg-black">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
