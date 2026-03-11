import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authAPI } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { HiEye, HiEyeOff } from 'react-icons/hi';

const schema = z.object({
    login: z.string().min(1, 'Email or username required'),
    password: z.string().min(1, 'Password required'),
});

export default function LoginPage() {
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (values) => {
        setLoading(true);
        try {
            const { data } = await authAPI.login(values);
            setAuth(data.data.user, data.data.accessToken);
            navigate('/feed', { replace: true });
        } catch (e) {
            toast.error(e.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold gradient-text mb-2">InstaClone</h1>
                    <p className="text-text-secondary text-sm">Sign in to see photos from your friends.</p>
                </div>

                {/* Card */}
                <div className="bg-surface-card border border-surface-border rounded-2xl p-8 space-y-4">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                        <div>
                            <input
                                {...register('login')}
                                placeholder="Username or email"
                                className="input-field"
                                autoComplete="username"
                            />
                            {errors.login && <p className="text-red-400 text-xs mt-1">{errors.login.message}</p>}
                        </div>

                        <div className="relative">
                            <input
                                {...register('password')}
                                type={showPass ? 'text' : 'password'}
                                placeholder="Password"
                                className="input-field pr-10"
                                autoComplete="current-password"
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                                {showPass ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                            </button>
                            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                            {loading ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Log in'}
                        </button>
                    </form>

                    <div className="flex items-center gap-3 my-2">
                        <div className="flex-1 h-px bg-surface-border" />
                        <span className="text-text-muted text-xs uppercase">or</span>
                        <div className="flex-1 h-px bg-surface-border" />
                    </div>

                    <Link to="/forgot-password" className="block text-center text-sm text-text-secondary hover:text-text-primary">
                        Forgot password?
                    </Link>
                </div>

                <div className="mt-4 text-center text-sm text-text-secondary">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-[#0095f6] font-semibold hover:underline">Sign up</Link>
                </div>
            </motion.div>
        </div>
    );
}
