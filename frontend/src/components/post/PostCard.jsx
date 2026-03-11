import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { postAPI, shareAPI, userAPI } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
    HiHeart, HiOutlineHeart, HiChat, HiBookmark, HiOutlineBookmark,
    HiPaperAirplane, HiDotsHorizontal, HiX, HiSearch, HiTrash, HiArchive,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { getMediaUrl } from '../../utils/media';

/* ─── Share Modal ─────────────────────────────────────────────────────────── */

function ShareModal({ postId, onClose }) {
    const [query, setQuery] = useState('');
    const [sharing, setSharing] = useState(null); // userId being shared to

    const { data: searchResults } = useQuery({
        queryKey: ['user-search', query],
        queryFn: () => userAPI.search(query).then(r => r.data.data || []),
        enabled: query.trim().length > 0,
    });

    const handleShare = async (user) => {
        setSharing(user._id);
        try {
            await shareAPI.sharePost(postId, user._id);
            toast.success(`Sent to @${user.username}!`);
            onClose();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Could not share');
        } finally {
            setSharing(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="bg-surface-card rounded-t-2xl sm:rounded-2xl w-full max-w-md p-4 max-h-[80vh] flex flex-col"
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Share to…</h3>
                    <button onClick={onClose}><HiX className="w-5 h-5 text-text-muted" /></button>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                    <input
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search friends…"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-muted border border-surface-border text-sm focus:outline-none focus:border-[#0095f6]"
                    />
                </div>

                {/* Results */}
                <div className="overflow-y-auto flex-1 space-y-1">
                    {searchResults?.map(u => (
                        <button
                            key={u._id}
                            onClick={() => handleShare(u)}
                            disabled={!!sharing}
                            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-surface-hover transition-colors"
                        >
                            {u.avatar_url ? (
                                <img src={getMediaUrl(u.avatar_url)} className="w-10 h-10 rounded-full object-cover" alt="" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f09433] to-[#bc1888] flex items-center justify-center text-white font-bold">
                                    {u.username?.[0]?.toUpperCase()}
                                </div>
                            )}
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{u.username}</p>
                                {u.full_name && <p className="text-xs text-text-secondary truncate">{u.full_name}</p>}
                            </div>
                            {sharing === u._id ? (
                                <div className="w-4 h-4 border-2 border-[#0095f6] border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <span className="text-xs text-[#0095f6] font-semibold">Send</span>
                            )}
                        </button>
                    ))}
                    {query.trim() && !searchResults?.length && (
                        <p className="text-center text-text-muted text-sm py-4">No users found</p>
                    )}
                    {!query.trim() && (
                        <p className="text-center text-text-muted text-sm py-4">Search for a friend to share with</p>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

/* ─── Post options menu ───────────────────────────────────────────────────── */

function OptionsMenu({ post, isOwner, onClose, onDeleted }) {
    const qc = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: () => postAPI.delete(post._id),
        onSuccess: () => {
            toast.success('Post deleted');
            qc.invalidateQueries(['feed']);
            qc.invalidateQueries(['profile-posts']);
            onDeleted?.();
            onClose();
        },
        onError: () => toast.error('Failed to delete post'),
    });

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-0 top-8 z-30 bg-surface-card border border-surface-border rounded-xl shadow-xl overflow-hidden min-w-[160px]"
        >
            {isOwner ? (
                <>
                    <button
                        onClick={() => { deleteMutation.mutate(); }}
                        disabled={deleteMutation.isPending}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-colors font-semibold"
                    >
                        <HiTrash className="w-4 h-4" />
                        {deleteMutation.isPending ? 'Deleting…' : 'Delete post'}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-text-primary hover:bg-surface-hover transition-colors"
                    >
                        <HiArchive className="w-4 h-4" />
                        Archive
                    </button>
                </>
            ) : (
                <button
                    onClick={onClose}
                    className="w-full px-4 py-3 text-sm text-text-primary hover:bg-surface-hover transition-colors text-left"
                >
                    Report
                </button>
            )}
            <button onClick={onClose} className="w-full px-4 py-3 text-sm text-text-secondary hover:bg-surface-hover transition-colors text-left border-t border-surface-border">
                Cancel
            </button>
        </motion.div>
    );
}

/* ─── Post Card ───────────────────────────────────────────────────────────── */

export default function PostCard({ post, onDeleted }) {
    const { user } = useAuthStore();
    const qc = useQueryClient();
    const navigate = useNavigate();
    const [liked, setLiked] = useState(post.is_liked || false);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [saved, setSaved] = useState(post.is_saved || false);
    const [showHeart, setShowHeart] = useState(false);
    const [currentMedia, setCurrentMedia] = useState(0);
    const [showShare, setShowShare] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    const isOwner = user?._id === (post.user_id?._id || post.user_id);

    const likeMutation = useMutation({
        mutationFn: () => liked ? postAPI.unlike(post._id) : postAPI.like(post._id),
        onMutate: () => { setLiked(!liked); setLikesCount(c => c + (liked ? -1 : 1)); },
        onError: () => { setLiked(liked); setLikesCount(c => c + (liked ? 1 : -1)); },
    });

    const saveMutation = useMutation({
        mutationFn: () => saved ? postAPI.unsave(post._id) : postAPI.save(post._id),
        onMutate: () => setSaved(!saved),
        onError: () => setSaved(saved),
    });

    const handleDoubleTap = () => {
        if (!liked) {
            setLiked(true); setLikesCount(c => c + 1);
            postAPI.like(post._id).catch(() => { setLiked(false); setLikesCount(c => c - 1); });
        }
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
    };

    const author = post.user_id;

    return (
        <>
            <article className="post-card mb-6">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                    <Link to={`/${author?.username}`} className="flex items-center gap-2.5">
                        {author?.avatar_url ? (
                            <img src={getMediaUrl(author.avatar_url)} alt={author.username} className="w-8 h-8 rounded-full object-cover ring-1 ring-surface-border" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white text-sm font-bold">
                                {author?.username?.[0]?.toUpperCase()}
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-semibold leading-none">{author?.username}</p>
                            {post.location && <p className="text-xs text-text-secondary mt-0.5">{post.location}</p>}
                        </div>
                    </Link>
                    {/* ⋯ Options menu */}
                    <div className="relative">
                        <button
                            className="text-text-secondary hover:text-text-primary p-1"
                            onClick={() => setShowOptions(o => !o)}
                        >
                            <HiDotsHorizontal className="w-5 h-5" />
                        </button>
                        <AnimatePresence>
                            {showOptions && (
                                <OptionsMenu
                                    post={post}
                                    isOwner={isOwner}
                                    onClose={() => setShowOptions(false)}
                                    onDeleted={onDeleted}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Media */}
                <div className="relative aspect-square bg-surface-card overflow-hidden cursor-pointer" onDoubleClick={handleDoubleTap}>
                    {post.media?.length > 0 && (
                        <img
                            src={getMediaUrl(post.media[currentMedia]?.full_url || post.media[currentMedia]?.medium_url)}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { e.target.style.opacity = '0.3'; }}
                        />
                    )}
                    <AnimatePresence>
                        {showHeart && (
                            <motion.div
                                initial={{ scale: 0, opacity: 1 }}
                                animate={{ scale: [0, 1.4, 1, 1.1, 0] }}
                                transition={{ duration: 0.8 }}
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            >
                                <HiHeart className="w-24 h-24 text-white drop-shadow-2xl" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {post.media?.length > 1 && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
                            {post.media.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentMedia ? 'bg-white' : 'bg-white/40'}`} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-4 pt-3 pb-1">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <button onClick={() => likeMutation.mutate()} className="text-text-primary hover:opacity-70 transition-opacity">
                                {liked ? <HiHeart className="w-6 h-6 text-red-500" /> : <HiOutlineHeart className="w-6 h-6" />}
                            </button>
                            <button onClick={() => navigate(`/p/${post._id}`)} className="text-text-primary hover:opacity-70">
                                <HiChat className="w-6 h-6" />
                            </button>
                            {/* Share button — opens share modal */}
                            <button
                                onClick={() => setShowShare(true)}
                                className="text-text-primary hover:opacity-70 -rotate-12"
                            >
                                <HiPaperAirplane className="w-6 h-6" />
                            </button>
                        </div>
                        <button onClick={() => saveMutation.mutate()} className="text-text-primary hover:opacity-70">
                            {saved ? <HiBookmark className="w-6 h-6" /> : <HiOutlineBookmark className="w-6 h-6" />}
                        </button>
                    </div>

                    {likesCount > 0 && (
                        <p className="text-sm font-semibold mb-1">{likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}</p>
                    )}

                    {post.caption && (
                        <p className="text-sm leading-relaxed">
                            <Link to={`/${author?.username}`} className="font-semibold mr-1">{author?.username}</Link>
                            {post.caption}
                        </p>
                    )}

                    {post.comments_count > 0 && (
                        <button onClick={() => navigate(`/p/${post._id}`)} className="text-sm text-text-secondary mt-1 hover:text-text-primary">
                            View all {post.comments_count} comments
                        </button>
                    )}

                    <p className="text-xs text-text-muted mt-1 uppercase tracking-wider">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                </div>
            </article>

            {/* Share modal */}
            <AnimatePresence>
                {showShare && <ShareModal postId={post._id} onClose={() => setShowShare(false)} />}
            </AnimatePresence>
        </>
    );
}
