import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';
import { searchAPI } from '../../api/client';
import { useUIStore } from '../../store/uiStore';
import { HiX, HiSearch } from 'react-icons/hi';
import { useState } from 'react';

export default function SearchPanel() {
    const { searchOpen, setSearchOpen } = useUIStore();
    const [q, setQ] = useState('');
    const debouncedQ = useDebounce(q, 300);

    const { data } = useQuery({
        queryKey: ['search-panel', debouncedQ],
        queryFn: () => searchAPI.search(debouncedQ).then(r => r.data.data),
        enabled: debouncedQ.length >= 2,
    });

    if (!searchOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-30" onClick={() => setSearchOpen(false)} />
            <motion.aside
                initial={{ x: -280, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -280, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-[72px] lg:left-60 top-0 h-full w-72 z-40 bg-surface-card border-r border-surface-border p-4 overflow-y-auto"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold">Search</h2>
                    <button onClick={() => setSearchOpen(false)} className="text-text-muted hover:text-text-primary">
                        <HiX className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative mb-4">
                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Search"
                        className="input-field pl-9 text-sm"
                        autoFocus
                    />
                </div>

                {data && (
                    <div className="space-y-1">
                        {(data.users || []).map(u => (
                            <Link key={u._id} to={`/${u.username}`} onClick={() => setSearchOpen(false)}
                                className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-hover">
                                {u.avatar_url ? (
                                    <img src={u.avatar_url} className="w-10 h-10 rounded-full object-cover" alt={u.username} />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold">
                                        {u.username[0].toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-sm">{u.username}</p>
                                    <p className="text-text-secondary text-xs">{u.full_name}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {!data && q.length < 2 && (
                    <p className="text-text-muted text-sm text-center mt-8">Type to search users and hashtags</p>
                )}
            </motion.aside>
        </>
    );
}
