import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { userAPI, storyAPI } from '../api/client';
import { motion } from 'framer-motion';
import { HiX, HiChevronLeft, HiChevronRight } from 'react-icons/hi';

const STORY_DURATION = 5000; // 5s for images

export default function StoryViewerPage() {
    const { userId, storyId } = useParams();
    const navigate = useNavigate();
    const [currentIdx, setCurrentIdx] = useState(0);
    const [paused, setPaused] = useState(false);
    const progressTimer = useRef(null);

    const { data: userStoriesData } = useQuery({
        queryKey: ['user-stories', userId],
        queryFn: () => storyAPI.getFeed().then(r => r.data.data.find(g => g.user?._id === userId || g._id === userId)),
    });

    const stories = userStoriesData?.stories || [];
    const story = stories[currentIdx];

    // Mark as viewed
    useEffect(() => {
        if (story) storyAPI.view(story._id).catch(() => { });
    }, [story]);

    // Auto-advance timer
    useEffect(() => {
        if (paused || !story) return;
        clearTimeout(progressTimer.current);
        progressTimer.current = setTimeout(() => {
            if (currentIdx < stories.length - 1) setCurrentIdx(i => i + 1);
            else navigate(-1);
        }, STORY_DURATION);
        return () => clearTimeout(progressTimer.current);
    }, [currentIdx, paused, story, stories.length]);

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
                    <video src={story.media_url} className="w-full h-full object-contain" autoPlay muted loop />
                ) : (
                    <img src={story.media_url} alt="" className="w-full h-full object-contain" />
                )}
            </div>

            {/* Caption */}
            {story.caption && (
                <div className="absolute bottom-20 left-0 right-0 text-center">
                    <p className="text-white text-sm font-medium drop-shadow px-4">{story.caption}</p>
                </div>
            )}

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
        </div>
    );
}
