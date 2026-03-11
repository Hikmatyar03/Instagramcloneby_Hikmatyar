import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reelsAPI, postAPI } from '../api/client';
import { HiHeart, HiOutlineHeart, HiChat, HiVolumeOff, HiVolumeUp, HiX } from 'react-icons/hi';

export default function ReelPage() {
    const { reelId } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const [muted, setMuted] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);

    const { data } = useQuery({
        queryKey: ['reel', reelId],
        queryFn: () => reelsAPI.get(reelId).then(r => {
            setLiked(r.data.data.is_liked || false);
            setLikesCount(r.data.data.likes_count || 0);
            return r.data.data;
        }),
    });

    const reel = data;
    const author = reel?.user_id;

    const handleLike = async () => {
        setLiked(!liked);
        setLikesCount(c => c + (liked ? -1 : 1));
        try {
            if (liked) await postAPI.unlike(reelId);
            else await postAPI.like(reelId);
        } catch { setLiked(liked); setLikesCount(c => c + (liked ? 1 : -1)); }
    };

    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
            {/* Close button */}
            <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-10 text-white bg-black/40 rounded-full p-2">
                <HiX className="w-6 h-6" />
            </button>

            {/* Video — 9:16 container */}
            <div className="reel-container" style={{ maxWidth: '390px', height: 'auto' }}>
                {reel?.media?.[0]?.thumbnail_url && (
                    <img
                        className="reel-thumb"
                        src={reel.media[0].thumbnail_url}
                        alt=""
                        style={{ zIndex: 0 }}
                    />
                )}
                {reel?.media?.[0]?.full_url || reel?.media?.[0]?.hls_url ? (
                    <video
                        ref={videoRef}
                        src={reel.media[0].full_url || reel.media[0].hls_url}
                        autoPlay
                        loop
                        playsInline
                        muted={muted}
                        style={{ zIndex: 1 }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-surface-card animate-pulse" style={{ zIndex: 1 }} />
                )}
                <div className="reel-overlay" style={{ zIndex: 2 }} />


                {/* Right action bar */}
                <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
                    {/* Author avatar */}
                    <div className="relative">
                        <div className="w-11 h-11 rounded-full ring-2 ring-white bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold">
                            {author?.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#0095f6] rounded-full w-5 h-5 flex items-center justify-center text-white text-xs font-bold">+</div>
                    </div>

                    {/* Like */}
                    <div className="flex flex-col items-center gap-1">
                        <button onClick={handleLike} className="text-white">
                            {liked ? <HiHeart className="w-7 h-7 text-red-500" /> : <HiOutlineHeart className="w-7 h-7" />}
                        </button>
                        <span className="text-white text-xs font-medium">{likesCount}</span>
                    </div>

                    {/* Comment */}
                    <div className="flex flex-col items-center gap-1">
                        <HiChat className="w-7 h-7 text-white" />
                        <span className="text-white text-xs font-medium">{reel?.comments_count || 0}</span>
                    </div>

                    {/* Mute */}
                    <button onClick={() => setMuted(!muted)} className="text-white">
                        {muted ? <HiVolumeOff className="w-6 h-6" /> : <HiVolumeUp className="w-6 h-6" />}
                    </button>
                </div>

                {/* Bottom info */}
                <div className="absolute bottom-6 left-4 right-16 text-white">
                    <p className="font-semibold text-sm mb-1 drop-shadow">@{author?.username}</p>
                    {reel?.caption && <p className="text-sm opacity-90 line-clamp-2 drop-shadow">{reel.caption}</p>}
                </div>
            </div>
        </div>
    );
}
