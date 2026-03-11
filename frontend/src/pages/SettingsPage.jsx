import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { userAPI, authAPI } from '../api/client';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const TABS = [
    { key: 'edit', label: 'Edit Profile' },
    { key: 'password', label: 'Change Password' },
    { key: 'privacy', label: 'Privacy & Security' },
    { key: 'notifications', label: 'Notifications' },
];

export default function SettingsPage() {
    const { tab = 'edit' } = useParams();
    const { user, updateUser, logout } = useAuthStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(tab);
    const [savingProfile, setSavingProfile] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const avatarInputRef = useRef(null);

    const { register: regProfile, handleSubmit: handleProfile } = useForm({ defaultValues: { full_name: user?.full_name, bio: user?.bio, website: user?.website } });
    const { register: regPass, handleSubmit: handlePass, reset: resetPass } = useForm();

    const onAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarLoading(true);
        try {
            const fd = new FormData();
            fd.append('avatar', file);
            const res = await userAPI.uploadAvatar(fd);
            updateUser({ avatar_url: res.data.data.avatar_url });
            toast.success('Avatar updated!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to upload avatar');
        } finally {
            setAvatarLoading(false);
        }
    };

    const onSaveProfile = async (data) => {
        setSavingProfile(true);
        try {
            const res = await userAPI.updateMe(data);
            updateUser(res.data.data);
            toast.success('Profile updated');
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
        finally { setSavingProfile(false); }
    };

    const onChangePassword = async (data) => {
        try {
            await authAPI.changePassword(data);
            toast.success('Password changed');
            resetPass();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    };

    const onDeactivate = async () => {
        if (!confirm('Are you sure you want to deactivate your account?')) return;
        // Deactivation logic
        logout();
        navigate('/');
    };

    return (
        <div className="max-w-[935px] mx-auto px-4 py-6 flex gap-0 flex-col lg:flex-row">
            {/* Sidebar */}
            <aside className="lg:w-48 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-surface-border mb-4 lg:mb-0 flex lg:flex-col gap-0 overflow-x-auto">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        className={`flex-shrink-0 text-left px-4 py-3 text-sm font-medium border-l-2 transition-colors ${activeTab === t.key ? 'border-text-primary text-text-primary bg-surface-hover' : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover'}`}>
                        {t.label}
                    </button>
                ))}
                <button onClick={onDeactivate} className="flex-shrink-0 text-left px-4 py-3 text-sm font-medium text-red-400 hover:bg-surface-hover">
                    Deactivate account
                </button>
            </aside>

            {/* Content */}
            <div className="flex-1 lg:px-8">
                {activeTab === 'edit' && (
                    <form onSubmit={handleProfile(onSaveProfile)} className="space-y-5 max-w-md">
                        <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>

                        {/* ── Avatar Upload ── */}
                        <div className="flex items-center gap-4 p-4 bg-surface-muted rounded-xl">
                            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-tr from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold text-xl">
                                {user?.avatar_url
                                    ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                    : user?.username?.[0]?.toUpperCase()
                                }
                            </div>
                            <div>
                                <p className="font-semibold text-sm">{user?.username}</p>
                                <button
                                    type="button"
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={avatarLoading}
                                    className="text-[#0095f6] text-sm font-semibold mt-0.5 hover:text-blue-400 disabled:opacity-50"
                                >
                                    {avatarLoading ? 'Uploading...' : 'Change profile photo'}
                                </button>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={onAvatarChange}
                                />
                            </div>
                        </div>
                        {[
                            { name: 'full_name', label: 'Full name', type: 'text' },
                            { name: 'bio', label: 'Bio (max 150 chars)', type: 'textarea' },
                            { name: 'website', label: 'Website', type: 'url' },
                        ].map(({ name, label, type }) => (
                            <div key={name}>
                                <label className="block text-sm font-medium mb-1">{label}</label>
                                {type === 'textarea' ? (
                                    <textarea {...regProfile(name)} maxLength={150} rows={3} className="input-field resize-none" />
                                ) : (
                                    <input {...regProfile(name)} type={type} className="input-field" />
                                )}
                            </div>
                        ))}
                        <button type="submit" disabled={savingProfile} className="btn-primary px-6">
                            {savingProfile ? 'Saving...' : 'Save'}
                        </button>
                    </form>
                )}

                {activeTab === 'password' && (
                    <form onSubmit={handlePass(onChangePassword)} className="space-y-4 max-w-md">
                        <h2 className="text-lg font-semibold mb-4">Change Password</h2>
                        {[
                            { name: 'currentPassword', label: 'Current password' },
                            { name: 'newPassword', label: 'New password' },
                        ].map(({ name, label }) => (
                            <div key={name}>
                                <label className="block text-sm font-medium mb-1">{label}</label>
                                <input {...regPass(name)} type="password" className="input-field" />
                            </div>
                        ))}
                        <button type="submit" className="btn-primary px-6">Change Password</button>
                    </form>
                )}

                {activeTab === 'privacy' && (
                    <div className="space-y-4 max-w-md">
                        <h2 className="text-lg font-semibold mb-4">Privacy & Security</h2>
                        <div className="flex items-center justify-between p-4 bg-surface-card rounded-xl border border-surface-border">
                            <div>
                                <p className="font-medium text-sm">Private account</p>
                                <p className="text-text-secondary text-xs mt-0.5">Only followers can see your posts</p>
                            </div>
                            <input type="checkbox" defaultChecked={user?.is_private}
                                onChange={async (e) => { await userAPI.updateMe({ is_private: e.target.checked }); updateUser({ is_private: e.target.checked }); }}
                                className="w-5 h-5 accent-[#0095f6] cursor-pointer" />
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="space-y-3 max-w-md">
                        <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
                        {['likes', 'comments', 'follows', 'follow_requests', 'mentions', 'live_videos', 'story_reactions'].map(key => (
                            <div key={key} className="flex items-center justify-between p-3 bg-surface-card rounded-xl border border-surface-border">
                                <p className="text-sm capitalize">{key.replace('_', ' ')}</p>
                                <input type="checkbox" defaultChecked={user?.notification_settings?.[key] ?? true}
                                    onChange={async (e) => { await userAPI.updateNotifSettings({ [key]: e.target.checked }); }}
                                    className="w-5 h-5 accent-[#0095f6] cursor-pointer" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
