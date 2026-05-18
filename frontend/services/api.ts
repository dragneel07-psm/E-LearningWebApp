// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, removeTokens } from '@/lib/auth';
import { getTenantFromSubdomain } from '@/lib/tenant';

function normalizeApiBaseUrl(rawUrl: string): string {
    const rawNormalized = (rawUrl || '').trim().toLowerCase();
    if (rawNormalized === '/api' || rawNormalized === 'api' || rawNormalized === 'same-origin' || rawNormalized === 'same_origin' || rawNormalized === 'relative') {
        // Keep paths in callers untouched (most service callers already prefix "/api/...").
        return '';
    }

    const candidates = (rawUrl || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    const apiAbsoluteCandidate = candidates.find((item) => /^https?:\/\//i.test(item) && /\/api(\/|$)/i.test(item));
    let normalized = apiAbsoluteCandidate
        || candidates.find((item) => /^https?:\/\//i.test(item))
        || candidates.find((item) => !item.startsWith('/'))
        || (rawUrl || '').trim();
    if (!normalized) {
        normalized = 'http://localhost:8000';
    }

    if (normalized.startsWith('/')) {
        normalized = 'http://localhost:8000';
    }

    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = `https://${normalized}`;
    }

    normalized = normalized.replace(/\/+$/, '');
    if (normalized.endsWith('/api')) {
        normalized = normalized.slice(0, -4);
    }

    return normalized;
}

const API_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

function readTenantHeader(config: { headers?: unknown }): string | null {
    const headers = config?.headers;
    if (!headers) return null;

    if (typeof headers === 'object' && headers !== null && 'get' in headers && typeof headers.get === 'function') {
        return headers.get('x-tenant-id') || headers.get('X-Tenant-Id') || null;
    }

    if (typeof headers === 'object' && headers !== null) {
        const recordHeaders = headers as Record<string, string | undefined>;
        return recordHeaders['x-tenant-id'] || recordHeaders['X-Tenant-Id'] || null;
    }

    return null;
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
                : (subdomainTenant && subdomainTenant !== 'localhost' ? subdomainTenant : null);
            config.headers['x-tenant-id'] = tenant || 'public';
        }
    }
    return config;
});

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            removeTokens();
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const { data } = await axios.post(
                `${API_URL}/api/users/token/refresh/`,
                { refresh: refreshToken },
            );
            const newAccess: string = data.access;
            setTokens(newAccess, refreshToken);
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            processQueue(null, newAccess);
            return api(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError, null);
            removeTokens();
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
