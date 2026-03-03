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

    // tenant.example.com -> tenant
    if (parts.length > 2) {
        return parts[0];
    }

    // Root domains like example.com do not imply a tenant.
    return null;
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
