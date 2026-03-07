'use client';

import { useEffect, useMemo, useState } from 'react';
import { getTenantFromSubdomain } from '@/lib/tenant';

type TenantIdentity = {
    tenantName: string | null;
    tenantSchema: string | null;
    isTenantContext: boolean;
    isLoading: boolean;
};

type TenantCheckResponse = {
    exists?: boolean;
    name?: string;
    schema_name?: string;
    id?: string;
};

function formatTenantNameFromSlug(slug: string): string {
    return slug
        .split(/[-_]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function useTenantIdentity(): TenantIdentity {
    const [tenantName, setTenantName] = useState<string | null>(null);
    const [tenantSchema, setTenantSchema] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const tenantSubdomain = useMemo(() => {
        if (typeof window === 'undefined') return null;
        return getTenantFromSubdomain(window.location.hostname);
    }, []);

    const isTenantContext = Boolean(tenantSubdomain && tenantSubdomain !== 'localhost');

    useEffect(() => {
        if (!isTenantContext || !tenantSubdomain) return;

        const cachedName = typeof window !== 'undefined' ? localStorage.getItem('tenant_name') : null;
        setTenantSchema(tenantSubdomain);
        setTenantName(cachedName || formatTenantNameFromSlug(tenantSubdomain));

        const controller = new AbortController();
        const fetchTenant = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/core/tenant-check/', {
                    method: 'GET',
                    headers: { 'x-tenant-id': tenantSubdomain },
                    cache: 'no-store',
                    signal: controller.signal,
                });

                if (!response.ok) return;

                const payload = (await response.json()) as TenantCheckResponse;
                if (!payload?.exists) return;

                const resolvedName = (payload.name || '').trim();
                const resolvedSchema = (payload.schema_name || '').trim().toLowerCase();

                if (resolvedSchema) {
                    setTenantSchema(resolvedSchema);
                }
                if (resolvedName) {
                    setTenantName(resolvedName);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('tenant_name', resolvedName);
                    }
                }
            } catch {
                // Keep derived/cached tenant label when tenant-check endpoint is unavailable.
            } finally {
                setIsLoading(false);
            }
        };

        fetchTenant();

        return () => controller.abort();
    }, [isTenantContext, tenantSubdomain]);

    return { tenantName, tenantSchema, isTenantContext, isLoading };
}

