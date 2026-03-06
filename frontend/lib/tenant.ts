// lib/tenant.ts

export const getTenantFromSubdomain = (hostname: string): string | null => {
    const normalizedHost = (hostname || '').trim().toLowerCase();
    const parts = normalizedHost.split('.').filter(Boolean);

    if (!normalizedHost) return null;

    if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
        return 'localhost';
    }

    // Handle demo.localhost
    if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
        return parts[0] === 'localhost' ? 'localhost' : parts[0];
    }

    // Ignore platform-managed hosts where first label is app name, not tenant.
    const managedHostSuffixes = [
        '.vercel.app',
        '.railway.app',
        '.up.railway.app',
    ];
    if (managedHostSuffixes.some((suffix) => normalizedHost.endsWith(suffix))) {
        return null;
    }

    // tenant.example.com -> tenant (except reserved public labels)
    if (parts.length > 2) {
        const label = parts[0];
        if (label === 'www') return null;
        return label;
    }

    // Root domains like example.com do not imply a tenant.
    return null;
};

export const isLocalHost = (hostname: string): boolean => {
    const normalizedHost = (hostname || '').trim().toLowerCase();
    if (!normalizedHost) return false;
    if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') return true;
    return normalizedHost.endsWith('.localhost') || normalizedHost.endsWith('.local');
};

export type LoginPortalContext = 'public' | 'tenant' | 'local';

export const getLoginPortalContext = (hostname: string): LoginPortalContext => {
    if (isLocalHost(hostname)) return 'local';
    return getTenantFromSubdomain(hostname) ? 'tenant' : 'public';
};

type TenantInfo = {
    id: string;
    name: string;
    logo: string;
    primaryColor: string;
};

function readCachedTenantInfo() {
    if (typeof window === 'undefined') {
        return { name: '', logo: '', primaryColor: '' };
    }
    return {
        name: localStorage.getItem('tenant_name') || '',
        logo: localStorage.getItem('tenant_logo') || '',
        primaryColor: localStorage.getItem('tenant_primary_color') || '',
    };
}

export const getTenantInfo = () => {
    // Default values for SSR to avoid hydration mismatch
    const defaultTenant: TenantInfo = {
        id: 'localhost',
        name: 'Local School',
        logo: '/logo_placeholder.png',
        primaryColor: 'hsl(222.2 47.4% 11.2%)',
    };

    if (typeof window === 'undefined') return defaultTenant;

    const hostname = window.location.hostname;
    const tenantId = getTenantFromSubdomain(hostname) || 'localhost';
    const cached = readCachedTenantInfo();

    const derivedName = tenantId === 'localhost'
        ? 'Local School'
        : `${tenantId.replace(/[-_]/g, ' ')} School`;

    return {
        id: tenantId,
        name: cached.name || derivedName,
        logo: cached.logo || '/logo_placeholder.png',
        primaryColor: cached.primaryColor || 'hsl(222.2 47.4% 11.2%)',
    };
};
