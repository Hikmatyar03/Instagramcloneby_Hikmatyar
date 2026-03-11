import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postAPI } from '../../api/client';

export default function CommentItem({ comment, postId }) {
    const qc = useQueryClient();
    const [liked, setLiked] = React.useState(comment.is_liked || false);
    const [likesCount, setLikesCount] = React.useState(comment.likes_count || 0);

    const likeCommentMut = useMutation({
        mutationFn: () => liked ? fetch(`/api/v1/comments/${comment._id}/like`, { method: 'DELETE' }) : postAPI.like(comment._id),
        onMutate: () => {
            setLiked(!liked);
            setLikesCount(c => c + (liked ? -1 : 1));
        },
    });

    const author = comment.user_id;
    return (
        <div className="flex gap-2.5">
            {author?.avatar_url ? (
                <img src={author.avatar_url} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" alt="" />
            ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {author?.username?.[0]?.toUpperCase()}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm">
                    <Link to={`/${author?.username}`} className="font-semibold mr-1">{author?.username}</Link>
                    <span className="text-text-primary">{comment.text}</span>
                </p>
                <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-text-muted">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                    {likesCount > 0 && <span className="text-xs text-text-muted font-semibold">{likesCount} likes</span>}
                </div>
            </div>
        </div>
    );
}
