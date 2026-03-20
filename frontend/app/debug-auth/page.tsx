// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, getUser, isAuthenticated } from '@/lib/auth';

export default function DebugAuthPage() {
    const [debugInfo, setDebugInfo] = useState<any>({});
    const router = useRouter();

    useEffect(() => {
        // Get all cookies
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {} as Record<string, string>);

        // Get localStorage
        const localStorage_access = localStorage.getItem('access_token');
        const localStorage_refresh = localStorage.getItem('refresh_token');

        // Get from our helper functions
        const token = getAccessToken();
        const user = getUser();
        const authenticated = isAuthenticated();

        setDebugInfo({
            cookies,
            localStorage: {
                access_token: localStorage_access ? 'SET (length: ' + localStorage_access.length + ')' : 'NOT SET',
                refresh_token: localStorage_refresh ? 'SET (length: ' + localStorage_refresh.length + ')' : 'NOT SET',
            },
            auth: {
                hasToken: !!token,
                user: user ? { username: user.username, role: user.role, exp: new Date(user.exp * 1000).toISOString() } : null,
                isAuthenticated: authenticated,
            },
            currentUrl: window.location.href,
            hostname: window.location.hostname,
        });
    }, []);

    return (
        <div className="p-8 bg-slate-900 min-h-screen text-white font-mono">
            <h1 className="text-2xl font-bold mb-6">🔍 Auth Debug Info</h1>
            <pre className="bg-slate-800 p-4 rounded overflow-auto text-xs">
                {JSON.stringify(debugInfo, null, 2)}
            </pre>

            <div className="mt-6 space-x-4">
                <button
                    onClick={() => window.location.href = '/login/student'}
                    className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                    Go to Login
                </button>
                <button
                    onClick={() => router.refresh()}
                    className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
                >
                    Refresh
                </button>
                <button
                    onClick={() => {
                        localStorage.clear();
                        document.cookie.split(";").forEach((c) => {
                            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                        });
                        router.push('/login/student');
                    }}
                    className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
                >
                    Clear All & Reload
                </button>
            </div>
        </div>
    );
}
