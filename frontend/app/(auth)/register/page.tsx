'use client';

import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#0a0a0c]">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <div className="absolute top-[10%] left-[20%] w-[50%] h-[50%] bg-violet-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[6s]" />
                <div className="absolute bottom-[10%] right-[20%] w-[50%] h-[50%] bg-fuchsia-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[7s]" />

                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
            </div>

            <Suspense fallback={<div className="text-white animate-pulse">Loading registration...</div>}>
                <div className="w-full flex justify-center px-4 sm:px-6 my-10">
                    <RegisterForm />
                </div>
            </Suspense>
        </div>
    );
}
