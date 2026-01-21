import axios from 'axios';
import { getAccessToken } from '@/lib/auth';
import { getTenantFromSubdomain } from '@/lib/tenant';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add interceptor to include token and tenant context
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        // 1. Auth Token
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 2. Tenant Context
        const tenant = getTenantFromSubdomain(window.location.hostname);
        if (tenant) {
            config.headers['x-tenant-id'] = tenant;
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
