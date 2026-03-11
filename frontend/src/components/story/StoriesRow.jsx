import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function StoriesRow({ groups }) {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const scrollRef = useRef(null);

    if (!groups || groups.length === 0) return null;

    return (
        <div className="border border-surface-border rounded-xl p-3 mb-2">
            <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
                {groups.map((group) => {
                    const hasUnviewed = group.stories?.some(s => !s.viewed);
                    const firstStory = group.stories?.[0];
                    const username = group.user?.username || group.username;
                    const avatar = group.user?.avatar_url || group.avatar_url;

                    return (
                        <button
                            key={group.user?._id || group._id}
                            onClick={() => navigate(`/stories/${group.user?._id || group._id}/${firstStory?._id}`)}
                            className="flex flex-col items-center gap-1.5 flex-shrink-0"
                        >
                            <div className={hasUnviewed ? 'story-ring' : 'story-ring-viewed'}>
                                <div className="bg-surface rounded-full p-0.5">
                                    {avatar ? (
                                        <img src={avatar} alt={username} className="w-14 h-14 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold text-lg">
                                            {username?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className="text-xs text-text-secondary truncate w-16 text-center">
                                {username === user?.username ? 'Your story' : username}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
