import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { storyAPI } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiChevronLeft, HiChevronRight, HiTrash, HiEye } from 'react-icons/hi';
import { getMediaUrl, getAvatarUrl } from '../utils/media';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const STORY_DURATION = 5000; // 5s for images

// Emoji reaction bar options (BUG 8)
const EMOJIS = ['❤️', '😂', '😮', '😢', '👏', '🔥'];

/* ─── Viewer Drawer (BUG 8) ───────────────────────────────────────────────── */
function ViewerDrawer({ storyId, onClose }) {
    const { data, isLoading } = useQuery({
        queryKey: ['story-viewers', storyId],
        queryFn: () => storyAPI.getViewers(storyId).then(r => r.data.data),
    });

    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="absolute bottom-0 left-0 right-0 bg-surface-card rounded-t-2xl z-20 max-h-[60%] flex flex-col"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border flex-shrink-0">
                <h3 className="font-semibold text-sm">Viewers ({data?.length ?? 0})</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-hover">
                    <HiX className="w-5 h-5 text-text-muted" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="space-y-0">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3">
                                <div className="w-10 h-10 rounded-full skeleton flex-shrink-0" />
                                <div className="h-3.5 w-32 rounded skeleton" />
                            </div>
                        ))}
                    </div>
                ) : data?.length === 0 ? (
                    <p className="text-center text-text-muted text-sm py-10">No viewers yet.</p>
                ) : (
                    data?.map((v, i) => {
                        const u = v.user_id;
                        return (
                            <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover">
                                {u?.avatar_url ? (
                                    <img src={getAvatarUrl(u.avatar_url)} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f09433] to-[#bc1888] flex items-center justify-center text-white font-bold flex-shrink-0">
                                        {u?.username?.[0]?.toUpperCase() ?? '?'}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{u?.username ?? 'Unknown'}</p>
                                    {v.viewed_at && (
                                        <p className="text-xs text-text-muted">
                                            {formatDistanceToNow(new Date(v.viewed_at), { addSuffix: true })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </motion.div>
    );
}

/* ─── StoryViewerPage ─────────────────────────────────────────────────────── */

export default function StoryViewerPage() {
    const { userId, storyId } = useParams();
    const navigate = useNavigate();
    const { user: me } = useAuthStore();
    const [currentIdx, setCurrentIdx] = useState(0);
    const [paused, setPaused] = useState(false);
    const [showViewers, setShowViewers] = useState(false);
    const progressTimer = useRef(null);

    const { data: userStoriesData } = useQuery({
        queryKey: ['user-stories', userId],
        queryFn: () => storyAPI.getFeed().then(r => r.data.data.find(g => g.user?._id === userId || g._id === userId)),
    });

    const stories = userStoriesData?.stories || [];
    const story = stories[currentIdx];
    const isOwner = story && (story.user_id?._id || story.user_id)?.toString() === me?._id?.toString();

    // Mark as viewed
    useEffect(() => {
        if (story) storyAPI.view(story._id).catch(() => { });
    }, [story]);

    // Auto-advance timer
    useEffect(() => {
        if (paused || !story || showViewers) return;
        clearTimeout(progressTimer.current);
        progressTimer.current = setTimeout(() => {
            if (currentIdx < stories.length - 1) setCurrentIdx(i => i + 1);
            else navigate(-1);
        }, STORY_DURATION);
        return () => clearTimeout(progressTimer.current);
    }, [currentIdx, paused, story, stories.length, showViewers]);

    // BUG 5: delete own story
    const deleteMutation = useMutation({
        mutationFn: () => storyAPI.delete(story._id),
        onSuccess: () => {
            toast.success('Story deleted');
            navigate(-1);
        },
        onError: () => toast.error('Failed to delete story'),
    });

    // BUG 8: react to story
    const reactMutation = useMutation({
        mutationFn: (emoji) => storyAPI.react(story._id, emoji),
        onSuccess: (_, emoji) => toast.success(`Reacted with ${emoji}`),
        onError: () => toast.error('Could not react'),
    });

    if (!story) return null;

    return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            {/* Progress bars */}
            <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
                {stories.map((_, i) => (
                    <div key={i} className="flex-1 h-0.5 bg-white/30 rounded overflow-hidden">
                        <div
                            className={`h-full bg-white ${i < currentIdx ? 'w-full' : i === currentIdx ? 'story-bar-animate' : 'w-0'}`}
                            style={i === currentIdx ? { animationDuration: `${STORY_DURATION}ms` } : {}}
                        />
                    </div>
                ))}
            </div>

            {/* Close */}
            <button onClick={() => navigate(-1)} className="absolute top-6 right-4 z-10 text-white">
                <HiX className="w-7 h-7" />
            </button>

            {/* BUG 5: Delete button for owner */}
            {isOwner && (
                <button
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="absolute top-6 right-14 z-10 text-white/80 hover:text-red-400 transition-colors"
                    aria-label="Delete story"
                >
                    <HiTrash className="w-6 h-6" />
                </button>
            )}

            {/* Author header */}
            <div className="absolute top-8 left-4 z-10 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-400 to-brand-700" />
                <span className="text-white text-sm font-semibold">{userStoriesData?.user?.username}</span>
            </div>

            {/* Story media */}
            <div
                className="w-full h-full"
                onMouseDown={() => setPaused(true)}
                onMouseUp={() => setPaused(false)}
                onTouchStart={() => setPaused(true)}
                onTouchEnd={() => setPaused(false)}
            >
                {story.media_type === 'video' ? (
                    <video src={getMediaUrl(story.media_url)} className="w-full h-full object-contain" autoPlay muted loop playsInline />
                ) : (
                    <img src={getMediaUrl(story.media_url)} alt="" className="w-full h-full object-contain" />
                )}
            </div>

            {/* Caption */}
            {story.caption && (
                <div className="absolute bottom-24 left-0 right-0 text-center">
                    <p className="text-white text-sm font-medium drop-shadow px-4">{story.caption}</p>
                </div>
            )}

            {/* BUG 8: Bottom bar — emoji reactions + viewer count (owner only) */}
            <div className="absolute bottom-6 left-0 right-0 z-10 flex items-center justify-between px-4">
                {/* Owner: viewer count / eye icon */}
                {isOwner ? (
                    <button
                        onClick={() => { setPaused(true); setShowViewers(true); }}
                        className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
                    >
                        <HiEye className="w-5 h-5" />
                        <span className="text-sm font-semibold">{story.viewers?.length ?? 0}</span>
                    </button>
                ) : (
                    <div /> /* spacer */
                )}

                {/* Emoji reaction bar */}
                <div className="flex items-center gap-2">
                    {EMOJIS.map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => reactMutation.mutate(emoji)}
                            disabled={reactMutation.isPending}
                            className="text-xl hover:scale-125 transition-transform active:scale-90"
                            aria-label={`React with ${emoji}`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>

            {/* Navigation */}
            {currentIdx > 0 && (
                <button onClick={() => setCurrentIdx(i => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
                    <HiChevronLeft className="w-8 h-8" />
                </button>
            )}
            {currentIdx < stories.length - 1 && (
                <button onClick={() => setCurrentIdx(i => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
                    <HiChevronRight className="w-8 h-8" />
                </button>
            )}

            {/* BUG 8: Viewer drawer overlay */}
            <AnimatePresence>
                {showViewers && (
                    <>
                        <div
                            className="absolute inset-0 z-10"
                            onClick={() => { setShowViewers(false); setPaused(false); }}
                        />
                        <ViewerDrawer
                            storyId={story._id}
                            onClose={() => { setShowViewers(false); setPaused(false); }}
                        />
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
