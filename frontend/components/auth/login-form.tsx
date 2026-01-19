'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
    role?: 'admin' | 'teacher' | 'student' | 'saas_admin';
    title?: string;
    subtitle?: string;
}

export function LoginForm({ role, title, subtitle }: LoginFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect');
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema)
    });

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        try {
            await authService.login(data);

            toast.success('Welcome back! Sign in successful.');

            // Redirect Logic
            if (redirectPath) {
                router.push(redirectPath);
            } else if (role) {
                router.push(`/${role}`);
            } else {
                router.push('/student'); // Default
            }
        } catch (err: any) {
            console.error("Login Error:", err);
            toast.error(err.response?.data?.detail || 'Invalid email or password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Dynamic gradient based on role
    const getGradient = () => {
        switch (role) {
            case 'admin': return 'from-red-500 via-orange-500 to-yellow-500';
            case 'teacher': return 'from-green-500 via-emerald-500 to-teal-500';
            case 'student': return 'from-blue-500 via-cyan-500 to-sky-500';
            default: return 'from-blue-500 via-purple-500 to-pink-500';
        }
    };

    const getButtonClass = () => {
        switch (role) {
            case 'admin': return 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-orange-900/20';
            case 'teacher': return 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 shadow-green-900/20';
            case 'student': return 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-900/20';
            default: return 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-blue-900/20';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-md relative z-10"
        >
            <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden">

                {/* Top Gradient Line */}
                <div className={`absolute top-0 left-0 w-full h-1 opacity-80 bg-gradient-to-r ${getGradient()}`} />

                <div className="p-8 sm:p-10 space-y-8">
                    <div className="space-y-2 text-center">
                        <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl mb-4 ring-1 ring-white/10"
                        >
                            <Sparkles className={`w-6 h-6 ${role === 'admin' ? 'text-orange-400' : role === 'teacher' ? 'text-green-400' : role === 'student' ? 'text-blue-400' : 'text-purple-400'}`} />
                        </motion.div>
                        <h1 className="text-3xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70">
                            {title || 'Welcome Back'}
                        </h1>
                        <p className="text-slate-400 text-sm tracking-wide">
                            {subtitle || 'Sign in to access your account'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300 text-xs uppercase tracking-wider font-semibold ml-1">Email Address</Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-white transition-colors duration-300" />
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        autoComplete="email"
                                        className={`pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5 transition-all duration-300 rounded-xl ${errors.email ? 'border-red-500/50 focus:border-red-500/50' : ''}`}
                                        {...register('email')}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-red-400 text-xs ml-1">{errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <Label htmlFor="password" className="text-slate-300 text-xs uppercase tracking-wider font-semibold">Password</Label>
                                    <Link href="/forgot-password" className="text-xs text-slate-400 hover:text-white transition-colors">Forgot password?</Link>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-white transition-colors duration-300" />
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className={`pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5 transition-all duration-300 rounded-xl ${errors.password ? 'border-red-500/50 focus:border-red-500/50' : ''}`}
                                        {...register('password')}
                                    />
                                </div>
                                {errors.password && (
                                    <p className="text-red-400 text-xs ml-1">{errors.password.message}</p>
                                )}
                            </div>
                        </div>

                        <Button
                            className={`w-full h-12 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:scale-[1.01] active:scale-[0.99] ${getButtonClass()}`}
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Sign In <ArrowRight className="h-4 w-4" />
                                </span>
                            )}
                        </Button>
                    </form>
                </div>

                <div className="py-5 px-8 bg-white/5 border-t border-white/5 flex items-center justify-center space-x-1">
                    <p className="text-xs text-slate-500">
                        Don't have an account?
                    </p>
                    <Link href="/register" className="text-xs text-white hover:underline font-medium">
                        Create an account
                    </Link>
                </div>
            </div>
            <p className="text-center mt-8 text-slate-500 text-sm">
                Protected by enterprise-grade security encryption
            </p>
        </motion.div>
    );
}
