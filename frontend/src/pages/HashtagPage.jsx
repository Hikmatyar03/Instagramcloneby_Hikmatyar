import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import InfiniteScroll from 'react-infinite-scroll-component';
import { searchAPI } from '../api/client';
import { Link } from 'react-router-dom';

export default function HashtagPage() {
    const { tag } = useParams();

    const { data: hashtagData } = useQuery({
        queryKey: ['hashtag', tag],
        queryFn: () => searchAPI.getHashtag(tag).then(r => r.data.data),
    });

    const { data: postsData, fetchNextPage, hasNextPage } = useInfiniteQuery({
        queryKey: ['hashtag-posts', tag],
        queryFn: ({ pageParam }) => searchAPI.getHashtagPosts(tag, pageParam).then(r => r.data.data),
        getNextPageParam: (last) => last.next_cursor || undefined,
    });

    const posts = postsData?.pages.flatMap(p => p.posts) ?? [];

    return (
        <div className="max-w-[935px] mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white text-2xl font-bold">
                    #
                </div>
                <div>
                    <h1 className="text-3xl font-bold">#{tag}</h1>
                    {hashtagData && (
                        <p className="text-text-secondary mt-1">
                            <span className="font-semibold text-text-primary">{hashtagData.posts_count?.toLocaleString()}</span> posts
                        </p>
                    )}
                </div>
            </div>

            {/* Posts grid */}
            <InfiniteScroll
                dataLength={posts.length}
                next={fetchNextPage}
                hasMore={!!hasNextPage}
                loader={<div className="col-span-3 h-8 skeleton rounded mt-1" />}
            >
                <div className="grid grid-cols-3 gap-0.5">
                    {posts.map(post => (
                        <Link key={post._id} to={`/p/${post._id}`} className="aspect-square overflow-hidden relative group bg-surface-muted">
                            <img
                                src={post.media?.[0]?.thumbnail_url || post.media?.[0]?.full_url}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity">
                                <span className="text-white font-bold text-sm">❤️ {post.likes_count}</span>
                                <span className="text-white font-bold text-sm">💬 {post.comments_count}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </InfiniteScroll>
        </div>
    );
}
