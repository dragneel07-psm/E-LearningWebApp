'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { getLoginPortalContext } from '@/lib/tenant';

export default function SaasLoginPage() {
    const router = useRouter();
    const portalContext = getLoginPortalContext(
        typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    );

    useEffect(() => {
        if (portalContext === 'tenant') {
            router.replace('/login');
        }
    }, [portalContext, router]);

    if (portalContext === 'tenant') return null;

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#050505]">
            {/* SaaS-specific Ambient Background Effects - Cyberspace feel */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <div className="absolute top-[-20%] left-[50%] transform -translate-x-1/2 w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />

                {/* Tech Grid Pattern */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}>
                </div>
            </div>

            <Suspense fallback={<div className="text-indigo-400 animate-pulse font-mono">Initializing System Core...</div>}>
                <div className="w-full flex justify-center px-4 sm:px-6 relative z-10">
                    <LoginForm
                        role="saas_admin"
                        title="SaaS Master Control"
                        subtitle="Authorized Personnel Only"
                    />
                </div>
            </Suspense>
        </div>
    );
}
