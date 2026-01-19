'use client';

import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function AdminLoginPage() {
    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#0a0a0c]">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[4s]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[5s]" />

                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
            </div>

            <Suspense fallback={<div className="text-white animate-pulse">Loading secure portal...</div>}>
                <div className="w-full flex justify-center px-4 sm:px-6">
                    <LoginForm role="admin" title="Admin Portal" subtitle="Secure access for administrators" />
                </div>
            </Suspense>
        </div>
    );
}
