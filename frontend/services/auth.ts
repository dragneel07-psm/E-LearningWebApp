// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import api from './api';
import {
    LoginCredentials,
    RegisterData,
    LoginResponse,
    RegisterResponse,
    UserProfile,
    UpdateProfileData,
    ChangePasswordData
} from '@/types/auth';
import { setTokens, removeTokens, isAuthenticated, getAccessToken } from '@/lib/auth';
import { getTenantFromSubdomain } from '@/lib/tenant';

const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.manyaltech.com';
const BASE_DOMAIN = COOKIE_DOMAIN.replace(/^\./, '');

function setTenantCookie(tenantId: string) {
    if (typeof window === 'undefined') return;
    const isSecure = window.location.protocol === 'https:';
    const host = (window.location.hostname || '').trim().toLowerCase();
    const useSharedManyaltechDomain =
        tenantId === 'public' && (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`);
    const encodedTenantId = encodeURIComponent(tenantId);
    const secureAttr = isSecure ? 'secure; ' : '';

    if (useSharedManyaltechDomain) {
        // Canonical public SaaS cookie: shared domain only.
        document.cookie = `tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `tenant_id=${encodedTenantId}; path=/; domain=${COOKIE_DOMAIN}; ${secureAttr}samesite=lax`;
    } else {
        // Canonical tenant/local cookie: host-scoped only.
        document.cookie = `tenant_id=; path=/; domain=${COOKIE_DOMAIN}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `tenant_id=${encodedTenantId}; path=/; ${secureAttr}samesite=lax`;
    }
}

export const authService = {
    async login(credentials: LoginCredentials & { totp_code?: string }) {
        // Pull school_code out — it's a header, not a POST body field
        const { school_code, totp_code, ...body } = credentials;
        const normalizedBody: Record<string, string> = {
            ...body,
            email: body.email?.trim().toLowerCase(),
            password: body.password,
        };
        // Include TOTP code in body when provided (required for saas_admin 2FA)
        if (totp_code) {
            normalizedBody.totp_code = totp_code;
        }

        // Determine tenant: explicit school_code > subdomain detection > 'public'
        const tenantId = school_code?.trim() ||
            (typeof window !== 'undefined'
                ? (
                    (localStorage.getItem('tenant_id') || '').trim()
                    || getTenantFromSubdomain(window.location.hostname)
                )
                : null) ||
            'public';

        // Keep tenant cache in sync before login so request-level fallbacks can't use stale tenant.
        if (typeof window !== 'undefined') {
            localStorage.setItem('tenant_id', tenantId);
        }

        const response = await api.post<LoginResponse>('/api/users/login/', normalizedBody, {
            headers: { 'x-tenant-id': tenantId },
        });

        if (response.data.access && response.data.refresh) {
            setTokens(response.data.access, response.data.refresh, { tenantId });
            // Cache school_code so subsequent requests use the right tenant
            if (typeof window !== 'undefined') {
                localStorage.setItem('tenant_id', tenantId);
                setTenantCookie(tenantId);
                if (response.data.user?.role) {
                    localStorage.setItem('user_role', response.data.user.role);
                }
            }
        }
        return response.data;
    },

    async register(data: RegisterData) {
        // SaaS Admin registration always goes to the 'public' schema
        const tenantId = 'public';

        const response = await api.post<RegisterResponse>('/api/users/register/', data, {
            headers: { 'x-tenant-id': tenantId },
        });
        return response.data;
    },

    async verifyEmail(uidb64: string, token: string) {
        const response = await api.post('/api/users/verify-email/', { uidb64, token }, {
            headers: { 'x-tenant-id': 'public' },
        });
        return response.data;
    },

    async getProfile() {
        const response = await api.get<UserProfile>('/api/users/accounts/me/');
        return response.data;
    },

    async updateProfile(data: UpdateProfileData) {
        const response = await api.patch<UserProfile>('/api/users/accounts/me/', data);
        return response.data;
    },

    async changePassword(data: ChangePasswordData) {
        const response = await api.post('/api/users/accounts/change-password/', data);
        return response.data;
    },

    logout() {
        removeTokens();
        // Optional: Call logout endpoint logic
        // api.post('/api/users/logout/');
    },

    isAuthenticated,
    getToken: getAccessToken
};
