import axios from 'axios';
import { getAccessToken } from '@/lib/auth';
import { getTenantFromSubdomain } from '@/lib/tenant';

const base_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_URL = (base_url.startsWith('http://') || base_url.startsWith('https://'))
    ? base_url
    : `https://${base_url}`;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

function readTenantHeader(config: any): string | null {
    const headers = config?.headers;
    if (!headers) return null;

    if (typeof headers.get === 'function') {
        return headers.get('x-tenant-id') || headers.get('X-Tenant-Id') || null;
    }

    return headers['x-tenant-id'] || headers['X-Tenant-Id'] || null;
}

// Add interceptor to include token and tenant context
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        // 1. Auth Token
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 2. Tenant Context — never overwrite an explicit request tenant
        const explicitTenant = (readTenantHeader(config) || '').trim().toLowerCase();
        if (!explicitTenant) {
            // Prefer the tenant cached at login time, fall back to subdomain detection
            const cachedTenant = (localStorage.getItem('tenant_id') || '').trim().toLowerCase();
            const subdomainTenant = (getTenantFromSubdomain(window.location.hostname) || '').trim().toLowerCase();
            // Use cached if available AND not 'localhost' (which means no tenant was resolved)
            const tenant = (cachedTenant && cachedTenant !== 'localhost')
                ? cachedTenant
                : (subdomainTenant !== 'localhost' ? subdomainTenant : null);
            if (tenant) {
                config.headers['x-tenant-id'] = tenant;
            }
        }
    }
    return config;
});

// Add response interceptor for 401 (Refresh Token Flow could be added here later)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // If 401 and we have a refresh token (TODO: Implement refresh logic)
        return Promise.reject(error);
    }
);

export default api;
