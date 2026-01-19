'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setToken } from '@/lib/auth';
import { getTenantInfo } from '@/lib/tenant';
import { Loader2, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginFormProps {
    role?: 'admin' | 'teacher' | 'student' | 'saas_admin';
    title?: string;
    subtitle?: string;
}

export function LoginForm({ role, title, subtitle }: LoginFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true); // New state for initial check
    const [error, setError] = useState('');

    const tenant = getTenantInfo();

    // Verify Tenant Existence on Mount
    useEffect(() => {
        const checkTenant = async () => {
            if (typeof window === 'undefined') return;

            const hostname = window.location.hostname;
            const parts = hostname.split('.');
            // If not localhost or saas domain
            if (parts.length > 1 && parts[0] !== 'www' && hostname !== 'localhost') {
                try {
                    const API_BASE_URL = `http://${hostname}:8000/api`;
                    // Call the new Tenant Check Endpoint
                    const res = await fetch(`${API_BASE_URL}/core/tenant-check/`);
                    if (!res.ok) {
                        // Tenant Not Found or Error
                        setError("School not found. Please check the URL.");
                        setLoading(true); // Block interaction
                    } else {
                        // Valid Tenant
                        await res.json();
                        // Ideally set tenant name title here using data.name
                    }

                    setPageLoading(false);
                } catch (e) {
                    console.error("Tenant check failed", e);
                    setError("Unable to connect to school server.");
                    setPageLoading(false);
                }
            } else {
                setPageLoading(false);
            }
        };
        checkTenant();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Get Token
            // 1. Get Token
            // Use dynamic base URL for Multi-Tenancy
            let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
            if (typeof window !== 'undefined') {
                // Determine API URL based on current hostname to support subdomains
                API_BASE_URL = `http://${window.location.hostname}:8000/api`;
            }

            const res = await fetch(`${API_BASE_URL}/token/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) throw new Error('Invalid credentials');
            const data = await res.json();
            const token = data.access;
            if (!token) throw new Error('No access token received');

            setToken(token);
            // localStorage.setItem('token', token); // Handled by setToken now? Check lib/auth but setToken does both usually. 
            // In the previous file it was doing both. setToken does both in lib/auth.ts (I checked earlier).

            // 2. Get User Role
            const meRes = await fetch(`${API_BASE_URL}/users/accounts/me/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (meRes.ok) {
                const user = await meRes.json();
                const userRole = user.role || 'student';

                // Optional: Enforce role if specified
                if (role && userRole !== role && !(role === 'admin' && userRole === 'saas_admin')) {
                    setError(`Access denied. You are not a ${role}.`);
                    setLoading(false);
                    return;
                }

                if (redirectPath) {
                    router.push(redirectPath);
                } else if (userRole === 'saas_admin') {
                    router.push('/saas');
                } else if (userRole === 'admin') {
                    router.push('/admin');
                } else {
                    router.push(`/${userRole}`);
                }
            } else {
                router.push('/student');
            }

        } catch (err) {
            console.error(err);
            setError('Invalid username or password');
        } finally {
            setLoading(false);
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

                {/* Decorative header accent */}
                {pageLoading && (
                    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-3xl">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                )}

                <div className={`absolute top-0 left-0 w-full h-1 opacity-80 bg-gradient-to-r ${role === 'admin' ? 'from-red-500 via-orange-500 to-yellow-500' :
                    role === 'teacher' ? 'from-green-500 via-emerald-500 to-teal-500' :
                        role === 'student' ? 'from-blue-500 via-cyan-500 to-sky-500' :
                            'from-blue-500 via-purple-500 to-pink-500' // default
                    }`} />

                <div className="p-8 sm:p-10 space-y-8">
                    <div className="space-y-2 text-center">
                        <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl mb-4 ring-1 ring-white/10"
                        >
                            <Sparkles className={`w-6 h-6 ${role === 'admin' ? 'text-orange-400' :
                                role === 'teacher' ? 'text-green-400' :
                                    role === 'student' ? 'text-blue-400' :
                                        'text-blue-400'
                                }`} />
                        </motion.div>
                        <h1 className="text-3xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70">
                            {title || tenant?.name || 'Welcome Back'}
                        </h1>
                        <p className="text-slate-400 text-sm tracking-wide">
                            {subtitle || 'Sign in to continue to your dashboard'}
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
                        {/* Hidden inputs to explicitly disable autofill in some browsers */}
                        <input type="text" style={{ display: 'none' }} />
                        <input type="password" style={{ display: 'none' }} />

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-slate-300 text-xs uppercase tracking-wider font-semibold ml-1">Username</Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-white transition-colors duration-300" />
                                    </div>
                                    <Input
                                        id="username"
                                        type="text"
                                        name="username_new_123" // Randomized name
                                        autoComplete="off"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5 transition-all duration-300 rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <Label htmlFor="password" className="text-slate-300 text-xs uppercase tracking-wider font-semibold">Password</Label>
                                    <a href="#" className="text-xs text-slate-400 hover:text-white transition-colors">Forgot password?</a>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-white transition-colors duration-300" />
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        name="password_new_123" // Randomized name
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5 transition-all duration-300 rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/10 text-red-200 text-sm p-4 rounded-xl border border-red-500/20 flex items-center gap-3"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                {error}
                            </motion.div>
                        )}

                        <Button
                            className={`w-full h-12 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:scale-[1.01] active:scale-[0.99] ${role === 'admin' ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-orange-900/20 hover:shadow-orange-900/40' :
                                role === 'teacher' ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 shadow-green-900/20 hover:shadow-green-900/40' :
                                    role === 'student' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-900/20 hover:shadow-blue-900/40' :
                                        'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-blue-900/20 hover:shadow-blue-900/40'
                                }`}
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Sign In <ArrowRight className="h-4 w-4" />
                                </span>
                            )}
                        </Button>
                    </form>
                </div>

                <div className="py-5 px-8 bg-white/5 border-t border-white/5 flex items-center justify-center">
                    <p className="text-xs text-slate-500 text-center">
                        Protected by enterprise-grade security encryption
                    </p>
                </div>
            </div>

            <p className="text-center mt-8 text-slate-500 text-sm">
                Need help? <a href="#" className="text-slate-400 hover:text-white transition-colors underline decoration-slate-600 hover:decoration-white underline-offset-4">Contact Support</a>
            </p>
        </motion.div>
    );
}
