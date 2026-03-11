import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI } from '../../api/client';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function SuggestionsPanel() {
    const { user } = useAuthStore();
    const qc = useQueryClient();

    const { data } = useQuery({
        queryKey: ['suggested'],
        queryFn: () => userAPI.getSuggested().then(r => r.data.data),
        staleTime: 120_000,
    });

    const followMut = useMutation({
        mutationFn: (username) => userAPI.follow(username),
        onSuccess: () => qc.invalidateQueries(['suggested']),
    });

    if (!user) return null;

    return (
        <div className="sticky top-6 pt-6">
            {/* Current user */}
            <div className="flex items-center justify-between mb-4">
                <Link to={`/${user.username}`} className="flex items-center gap-3">
                    {user.avatar_url ? (
                        <img src={user.avatar_url} className="w-11 h-11 rounded-full object-cover" alt="" />
                    ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold">
                            {user.username?.[0]?.toUpperCase()}
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-semibold">{user.username}</p>
                        <p className="text-xs text-text-secondary">{user.full_name}</p>
                    </div>
                </Link>
            </div>

            {/* Suggested */}
            {(data || []).length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Suggested for you</p>
                    </div>
                    <div className="space-y-3">
                        {(data || []).slice(0, 5).map(u => (
                            <div key={u._id} className="flex items-center justify-between">
                                <Link to={`/${u.username}`} className="flex items-center gap-2.5 flex-1 min-w-0">
                                    {u.avatar_url ? (
                                        <img src={u.avatar_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                            {u.username[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold truncate">{u.username}</p>
                                        <p className="text-xs text-text-muted truncate">Suggested for you</p>
                                    </div>
                                </Link>
                                <button
                                    onClick={() => followMut.mutate(u.username)}
                                    disabled={followMut.isPending}
                                    className="text-[#0095f6] text-xs font-semibold hover:text-white ml-2 flex-shrink-0"
                                >
                                    Follow
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
