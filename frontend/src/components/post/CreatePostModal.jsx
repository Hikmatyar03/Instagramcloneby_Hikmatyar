import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiX, HiPhotograph, HiArrowLeft, HiFilm, HiClock, HiVideoCamera,
} from 'react-icons/hi';
import { postAPI, reelsAPI, storyAPI } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

/* ─── Client-side thumbnail generator ─────────────────────────────────────── */

function generateThumbnail(videoFile) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const url = URL.createObjectURL(videoFile);
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        video.currentTime = 0.1; // grab as close to first frame as possible
        video.onloadeddata = () => {
            canvas.width = video.videoWidth || 720;
            canvas.height = video.videoHeight || 1280;
            canvas.getContext('2d').drawImage(video, 0, 0);
            canvas.toBlob(
                (blob) => { URL.revokeObjectURL(url); resolve(blob); },
                'image/jpeg',
                0.85,
            );
        };
        video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    });
}

/* ─── Type choices ─────────────────────────────────────────────────────────── */


const TYPES = [
    { key: 'post',  label: 'Post',    icon: HiPhotograph,  accept: 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime', multi: true,  hint: 'Share photos & videos' },
    { key: 'reel',  label: 'Reel',    icon: HiFilm,        accept: 'video/mp4,video/quicktime,video/webm',                      multi: false, hint: 'Short vertical video' },
    { key: 'story', label: 'Story',   icon: HiClock,       accept: 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime', multi: false, hint: 'Disappears in 24 hours' },
    { key: 'live',  label: 'Go Live', icon: HiVideoCamera, accept: null,                                                        multi: false, hint: 'Broadcast in real time' },
];

export default function CreatePostModal({ onClose }) {
    const [step, setStep]               = useState('type');    // 'type' | 'select' | 'details' | 'live'
    const [selectedType, setSelectedType] = useState(null);
    const [files, setFiles]             = useState([]);
    const [previews, setPreviews]       = useState([]);
    const [currentPreview, setCurrentPreview] = useState(0);
    const [caption, setCaption]         = useState('');
    const [location, setLocation]       = useState('');
    const [loading, setLoading]         = useState(false);
    const fileInputRef = useRef(null);
    const qc = useQueryClient();

    /* ─── Helpers ──────────────────────────────────────────────────────────── */

    const handleTypeSelect = (type) => {
        if (type.key === 'live') {
            setSelectedType(type);
            setStep('live');
            return;
        }
        setSelectedType(type);
        setStep('select');
    };

    const handleFiles = (chosen) => {
        const arr = Array.from(chosen).slice(0, selectedType?.multi ? 10 : 1);

        // Client-side file size validation
        const maxBytes = (mb) => mb * 1024 * 1024;
        const oversized = arr.find(f => {
            const isVideo = f.type.startsWith('video/');
            return f.size > (isVideo ? maxBytes(50) : maxBytes(10));
        });
        if (oversized) {
            const isVideo = oversized.type.startsWith('video/');
            toast.error(`File too large. Max ${isVideo ? '50' : '10'}MB for ${isVideo ? 'videos' : 'images'}.`);
            return;
        }

        setFiles(arr);
        const urls = arr.map(f => URL.createObjectURL(f));
        setPreviews(urls);
        setCurrentPreview(0);
        setStep('details');
    };

    const handleSubmit = async () => {
        if (files.length === 0) return;
        setLoading(true);
        try {
            const fd = new FormData();
            files.forEach(f => fd.append('files', f));
            fd.append('caption', caption);
            fd.append('location', location);

            if (selectedType.key === 'post') {
                const mediaType = files.length > 1
                    ? 'carousel'
                    : files[0].type.startsWith('video/') ? 'video' : 'photo';
                fd.append('type', mediaType);
                await postAPI.create(fd);
                qc.invalidateQueries(['feed']);
                toast.success('Post shared!');

            } else if (selectedType.key === 'reel') {
                // Generate thumbnail from first video frame before uploading
                const thumbBlob = await generateThumbnail(files[0]);
                if (thumbBlob) fd.append('thumbnail', thumbBlob, 'thumb.jpg');
                await reelsAPI.create(fd);
                qc.invalidateQueries(['reels-feed']);
                toast.success('Reel uploaded!');

            } else if (selectedType.key === 'story') {
                // storyAPI.create expects a single 'file' field
                const sf = new FormData();
                sf.append('file', files[0]);
                sf.append('type', files[0].type.startsWith('video/') ? 'video' : 'image');
                await storyAPI.create(sf);
                qc.invalidateQueries(['stories']);
                toast.success('Story posted!');
            }

            onClose();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to post');
        } finally {
            setLoading(false);
        }
    };

    /* ─── Back navigation ──────────────────────────────────────────────────── */

    const handleBack = () => {
        if (step === 'details') { setFiles([]); setPreviews([]); setStep('select'); }
        else if (step === 'select' || step === 'live') { setStep('type'); setSelectedType(null); }
    };

    /* ─── Render ───────────────────────────────────────────────────────────── */

    const headerTitle = {
        type:    'Create',
        select:  selectedType?.label,
        details: 'Share',
        live:    'Go Live',
    }[step];

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 20 }}
                className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
                    {step !== 'type' ? (
                        <button onClick={handleBack} className="text-text-secondary hover:text-text-primary">
                            <HiArrowLeft className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="w-5" />
                    )}
                    <h2 className="font-semibold text-sm">{headerTitle}</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <HiX className="w-5 h-5" />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {/* ── Step 1: Type Picker ── */}
                    {step === 'type' && (
                        <motion.div
                            key="type"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-6 grid grid-cols-2 gap-3"
                        >
                            {TYPES.map((t) => {
                                const Icon = t.icon;
                                const isLive = t.key === 'live';
                                return (
                                    <button
                                        key={t.key}
                                        onClick={() => handleTypeSelect(t)}
                                        className={`flex flex-col items-center gap-2 p-5 rounded-2xl border transition-all hover:scale-[1.02] ${isLive
                                            ? 'border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400'
                                            : 'border-surface-border bg-surface-muted hover:bg-surface-hover text-text-primary'
                                        }`}
                                    >
                                        <Icon className="w-8 h-8" />
                                        <span className="font-semibold text-sm">{t.label}</span>
                                        <span className="text-xs text-text-muted text-center">{t.hint}</span>
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}

                    {/* ── Step 2: File Selector ── */}
                    {step === 'select' && (
                        <motion.div
                            key="select"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col items-center justify-center py-20 cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                        >
                            <selectedType.icon className="w-16 h-16 text-text-muted mb-4" />
                            <p className="font-semibold mb-1">
                                {selectedType?.key === 'reel' ? 'Select a video' : 'Select from computer'}
                            </p>
                            <p className="text-text-secondary text-sm mb-4">or drag and drop here</p>
                            <button className="btn-primary text-sm px-4 py-2">Browse files</button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple={selectedType?.multi}
                                accept={selectedType?.accept}
                                className="hidden"
                                onChange={e => handleFiles(e.target.files)}
                            />
                        </motion.div>
                    )}

                    {/* ── Step 3: Details + Preview ── */}
                    {step === 'details' && (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col sm:flex-row"
                        >
                            {/* Preview */}
                            <div className="relative sm:w-60 aspect-square bg-surface-muted flex-shrink-0">
                                {previews[currentPreview] && (
                                    files[currentPreview]?.type.startsWith('video/')
                                        ? <video src={previews[currentPreview]} className="w-full h-full object-cover" controls />
                                        : <img src={previews[currentPreview]} className="w-full h-full object-cover" alt="" />
                                )}
                                {previews.length > 1 && (
                                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                                        {previews.map((_, i) => (
                                            <button key={i} onClick={() => setCurrentPreview(i)}
                                                className={`w-1.5 h-1.5 rounded-full ${i === currentPreview ? 'bg-white' : 'bg-white/40'}`} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 p-4 space-y-4">
                                <textarea
                                    value={caption}
                                    onChange={e => setCaption(e.target.value)}
                                    placeholder="Write a caption..."
                                    maxLength={2200}
                                    rows={5}
                                    className="input-field resize-none text-sm"
                                />
                                {selectedType?.key === 'post' && (
                                    <input
                                        value={location}
                                        onChange={e => setLocation(e.target.value)}
                                        placeholder="Add location..."
                                        className="input-field text-sm"
                                        maxLength={50}
                                    />
                                )}
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="btn-primary w-full py-2.5"
                                >
                                    {loading ? 'Sharing...' : selectedType?.key === 'reel' ? 'Upload Reel' : selectedType?.key === 'story' ? 'Add to Story' : 'Share'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Go Live Coming Soon ── */}
                    {step === 'live' && (
                        <motion.div
                            key="live"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-16 px-8 text-center"
                        >
                            <span className="text-5xl mb-4">🔴</span>
                            <h3 className="text-xl font-bold mb-2">Live is Coming Soon</h3>
                            <p className="text-text-secondary text-sm leading-relaxed">
                                Live broadcasting requires a media server. This feature will be available in the next version.
                            </p>
                            <button onClick={onClose} className="btn-primary mt-6 px-6">Got it</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
