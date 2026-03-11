import React, { useState, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import InfiniteScroll from 'react-infinite-scroll-component';
import { postAPI, searchAPI } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import { HiSearch, HiFilm, HiHashtag } from 'react-icons/hi';
import { useDebounce } from '../hooks/useDebounce';

const FILTER_TABS = ['Top', 'Accounts', 'Tags'];

export default function ExplorePage() {
    const [filter, setFilter] = useState('Top');
    const [searchQ, setSearchQ] = useState('');
    const debouncedQ = useDebounce(searchQ, 300);

    const { data: searchResults } = useInfiniteQuery({
        queryKey: ['search', debouncedQ],
        queryFn: () => searchAPI.search(debouncedQ).then(r => r.data.data),
        enabled: debouncedQ.length >= 2,
        staleTime: 30_000,
    });

    const {
        data: exploreData,
        fetchNextPage,
        hasNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ['explore', filter],
        queryFn: ({ pageParam }) => postAPI.getExplore(pageParam, filter === 'Top' ? null : filter.toLowerCase()).then(r => r.data.data),
        getNextPageParam: (last) => last.next_cursor || undefined,
        staleTime: 60_000,
    });

    const posts = exploreData?.pages.flatMap(p => p.posts) ?? [];
    const showSearch = searchQ.length >= 2 && searchResults;

    return (
        <div className="max-w-[935px] mx-auto px-4 py-6">
            {/* Search Bar */}
            <div className="relative mb-6">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                <input
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search"
                    className="input-field pl-10"
                />
            </div>

            {/* Search results overlay */}
            {showSearch ? (
                <div className="space-y-2">
                    {(searchResults?.pages?.[0]?.users || []).map(u => (
                        <Link key={u._id} to={`/${u.username}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-card">
                            {u.avatar_url ? (
                                <img src={u.avatar_url} className="w-10 h-10 rounded-full object-cover" alt={u.username} />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold">{u.username[0].toUpperCase()}</div>
                            )}
                            <div>
                                <p className="font-semibold text-sm">{u.username}</p>
                                <p className="text-text-secondary text-xs">{u.full_name}</p>
                            </div>
                        </Link>
                    ))}
                    {(searchResults?.pages?.[0]?.hashtags || []).map(h => (
                        <Link key={h._id} to={`/hashtag/${h.tag}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-card">
                            <div className="w-10 h-10 rounded-full bg-surface-card flex items-center justify-center">
                                <HiHashtag className="w-5 h-5 text-text-secondary" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">#{h.tag}</p>
                                <p className="text-text-secondary text-xs">{h.posts_count.toLocaleString()} posts</p>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <>
                    {/* Filter tabs */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                        {FILTER_TABS.map(tab => (
                            <button key={tab} onClick={() => setFilter(tab)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium flex-shrink-0 transition-colors ${filter === tab ? 'bg-text-primary text-surface' : 'bg-surface-card text-text-secondary border border-surface-border hover:bg-surface-hover'}`}>
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* 3-column grid */}
                    <InfiniteScroll
                        dataLength={posts.length}
                        next={fetchNextPage}
                        hasMore={!!hasNextPage}
                        loader={<div className="col-span-3 h-8 skeleton rounded mt-1" />}
                    >
                        <div className="grid grid-cols-3 gap-0.5">
                            {posts.map((post, i) => (
                                <Link key={post._id} to={`/p/${post._id}`}
                                    className={`relative overflow-hidden bg-surface-muted group ${i % 7 === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'}`}>
                                    <img
                                        src={post.media?.[0]?.thumbnail_url || post.media?.[0]?.full_url}
                                        alt=""
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    {post.type === 'reel' && (
                                        <div className="absolute top-2 right-2"><HiFilm className="w-4 h-4 text-white drop-shadow" /></div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity">
                                        <span className="text-white font-bold text-sm">❤️ {post.likes_count}</span>
                                        <span className="text-white font-bold text-sm">💬 {post.comments_count}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </InfiniteScroll>
                </>
            )}
        </div>
    );
}
