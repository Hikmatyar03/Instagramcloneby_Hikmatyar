import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { postAPI } from '../api/client';
import PostCard from '../components/post/PostCard';
import CommentItem from '../components/comment/CommentItem';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function PostDetailPage() {
    const { postId } = useParams();
    const { user } = useAuthStore();
    const qc = useQueryClient();
    const [commentText, setCommentText] = useState('');

    const { data: postData } = useQuery({
        queryKey: ['post', postId],
        queryFn: () => postAPI.get(postId).then(r => r.data.data),
    });

    const { data: commentsData, fetchNextPage, hasNextPage } = useInfiniteQuery({
        queryKey: ['comments', postId],
        queryFn: ({ pageParam }) => postAPI.getComments(postId, pageParam).then(r => r.data.data),
        getNextPageParam: (last) => last.next_cursor || undefined,
    });

    const addCommentMutation = useMutation({
        mutationFn: () => postAPI.addComment(postId, commentText.trim()),
        onSuccess: () => {
            setCommentText('');
            qc.invalidateQueries(['comments', postId]);
        },
        onError: (e) => toast.error(e.response?.data?.message || 'Failed to comment'),
    });

    const handleComment = (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        addCommentMutation.mutate();
    };

    const comments = commentsData?.pages.flatMap(p => p.comments) ?? [];

    return (
        <div className="max-w-[935px] mx-auto px-4 py-6">
            <div className="lg:flex lg:gap-0 border border-surface-border rounded-xl overflow-hidden">
                {/* Post (reuse PostCard) */}
                <div className="lg:w-[560px] flex-shrink-0">
                    {postData && <PostCard post={postData} isDetail />}
                </div>

                {/* Comments Panel */}
                <div className="flex-1 border-l border-surface-border flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[500px]" id="commentsScroll">
                        <InfiniteScroll
                            dataLength={comments.length}
                            next={fetchNextPage}
                            hasMore={!!hasNextPage}
                            scrollableTarget="commentsScroll"
                            loader={<div className="skeleton h-8 rounded" />}
                        >
                            {comments.map(c => <CommentItem key={c._id} comment={c} postId={postId} />)}
                        </InfiniteScroll>
                    </div>

                    {/* Comment Input */}
                    <form onSubmit={handleComment} className="border-t border-surface-border p-3 flex items-center gap-3">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {user?.username?.[0]?.toUpperCase()}
                            </div>
                        )}
                        <input
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-1 bg-transparent text-sm focus:outline-none text-text-primary placeholder:text-text-muted"
                            maxLength={1000}
                        />
                        <button type="submit" disabled={!commentText.trim() || addCommentMutation.isPending}
                            className="text-[#0095f6] font-semibold text-sm disabled:opacity-40 hover:text-white">
                            Post
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
