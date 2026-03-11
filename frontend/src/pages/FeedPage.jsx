import React, { useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import InfiniteScroll from 'react-infinite-scroll-component';
import { postAPI, storyAPI } from '../api/client';
import PostCard from '../components/post/PostCard';
import StoriesRow from '../components/story/StoriesRow';
import PostCardSkeleton from '../components/skeletons/PostCardSkeleton';
import SuggestionsPanel from '../components/user/SuggestionsPanel';

export default function FeedPage() {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ['feed'],
        queryFn: ({ pageParam }) => postAPI.getFeed(pageParam).then(r => r.data.data),
        getNextPageParam: (last) => last.next_cursor || undefined,
        staleTime: 60_000,
    });

    const { data: storiesData } = useQuery({
        queryKey: ['stories-feed'],
        queryFn: () => storyAPI.getFeed().then(r => r.data.data),
        staleTime: 30_000,
    });

    const posts = data?.pages.flatMap(p => p.posts) ?? [];

    return (
        <div className="max-w-[470px] mx-auto px-4 py-6 lg:flex lg:gap-8 lg:max-w-none">

            {/* ── Center Feed ───────────────────────────── */}
            <div className="flex-1 max-w-[470px] mx-auto">
                {/* Stories Row */}
                <StoriesRow groups={storiesData || []} />

                {/* Posts */}
                {isLoading ? (
                    <div className="space-y-6 mt-6">
                        {[...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 text-text-secondary">
                        <p className="text-lg font-semibold">Your feed is empty</p>
                        <p className="text-sm mt-1">Follow accounts to see their photos and videos here.</p>
                    </div>
                ) : (
                    <InfiniteScroll
                        dataLength={posts.length}
                        next={fetchNextPage}
                        hasMore={!!hasNextPage}
                        loader={<PostCardSkeleton />}
                        className="space-y-6 mt-6"
                    >
                        {posts.map(post => <PostCard key={post._id} post={post} />)}
                    </InfiniteScroll>
                )}
            </div>

            {/* ── Right Sidebar (Desktop only) ──────────── */}
            <aside className="hidden xl:block w-80 flex-shrink-0">
                <SuggestionsPanel />
            </aside>
        </div>
    );
}
