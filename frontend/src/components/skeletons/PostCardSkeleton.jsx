import React from 'react';

export default function PostCardSkeleton() {
    return (
        <div className="post-card mb-6 animate-pulse">
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="skeleton w-8 h-8 rounded-full" />
                <div className="skeleton h-3 w-28 rounded" />
            </div>
            <div className="skeleton aspect-square" />
            <div className="px-4 pt-3 space-y-2">
                <div className="flex gap-3">
                    <div className="skeleton w-6 h-6 rounded" />
                    <div className="skeleton w-6 h-6 rounded" />
                    <div className="skeleton w-6 h-6 rounded" />
                </div>
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-3 w-48 rounded" />
                <div className="skeleton h-3 w-32 rounded" />
            </div>
        </div>
    );
}
