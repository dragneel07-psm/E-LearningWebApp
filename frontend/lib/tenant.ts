// lib/tenant.ts

export const getTenantFromSubdomain = (hostname: string): string | null => {
    const parts = hostname.split('.');
    // Handle demo.localhost or school.com
    if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
        return parts[0] === 'localhost' ? 'localhost' : parts[0];
    }
    if (parts.length > 2) {
        return parts[0];
    }
    return parts[0]; // Default or localhost
};

// Hook or function to get tenant info (mocked for now, or fetches from API)
export const getTenantInfo = () => {
    // Default values for SSR to avoid hydration mismatch
    const defaultTenant = {
        id: 'localhost',
        name: 'Local School',
        logo: '/logo_placeholder.png',
        primaryColor: 'hsl(222.2 47.4% 11.2%)',
    };

    if (typeof window === 'undefined') return defaultTenant;

    const hostname = window.location.hostname;
    const tenantId = getTenantFromSubdomain(hostname);
    // In real app, we might fetch tenant details from API based on this ID/Subdomain
    return {
        id: tenantId,
        name: tenantId === 'localhost' ? 'Local School' : `${tenantId} School`,
        logo: '/logo_placeholder.png', // Dynamic logo
        primaryColor: 'hsl(222.2 47.4% 11.2%)', // Example
    };
};
