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
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores'),
    email: z.string().email(),
    full_name: z.string().optional(),
    password: z.string().min(8).regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'Must contain a letter and a number'),
});

export default function SignupPage() {
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

    const onSubmit = async (values) => {
        setLoading(true);
        try {
            const { data } = await authAPI.register(values);
            setAuth(data.data.user, data.data.accessToken);
            toast.success('Welcome to InstaClone!');
            navigate('/feed', { replace: true });
        } catch (e) {
            toast.error(e.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold gradient-text mb-2">InstaClone</h1>
                    <p className="text-text-secondary text-sm">Sign up to see photos and videos from your friends.</p>
                </div>

                <div className="bg-surface-card border border-surface-border rounded-2xl p-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                        {[
                            { name: 'email', placeholder: 'Email', type: 'email' },
                            { name: 'full_name', placeholder: 'Full name (optional)', type: 'text' },
                            { name: 'username', placeholder: 'Username', type: 'text' },
                        ].map(({ name, placeholder, type }) => (
                            <div key={name}>
                                <input {...register(name)} type={type} placeholder={placeholder} className="input-field" />
                                {errors[name] && <p className="text-red-400 text-xs mt-1">{errors[name].message}</p>}
                            </div>
                        ))}

                        <div className="relative">
                            <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="Password" className="input-field pr-10" />
                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                                {showPass ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                            </button>
                            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                        </div>

                        <p className="text-text-muted text-xs">
                            By signing up, you agree to our Terms and Privacy Policy.
                        </p>

                        <button type="submit" disabled={loading} className="btn-gradient w-full py-2.5">
                            {loading ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Sign up'}
                        </button>
                    </form>
                </div>

                <div className="mt-4 text-center text-sm text-text-secondary">
                    Have an account?{' '}
                    <Link to="/" className="text-[#0095f6] font-semibold hover:underline">Log in</Link>
                </div>
            </motion.div>
        </div>
    );
}
