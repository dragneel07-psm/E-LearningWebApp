'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// SaaS admin login has moved to /saas-login (dedicated separate page).
// This redirect exists for backwards-compatibility with any bookmarked URLs.
export default function SaasLoginRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/saas-login');
    }, [router]);

    return null;
}
