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

function setTenantCookie(tenantId: string) {
    if (typeof window === 'undefined') return;
    const isSecure = window.location.protocol === 'https:';
    const host = (window.location.hostname || '').trim().toLowerCase();
    const useSharedManyaltechDomain =
        tenantId === 'public' && (host === 'manyaltech.com' || host === 'www.manyaltech.com');
    const domainPart = useSharedManyaltechDomain ? 'domain=.manyaltech.com; ' : '';
    document.cookie = `tenant_id=${encodeURIComponent(tenantId)}; path=/; ${domainPart}${isSecure ? 'secure;' : ''} samesite=lax`;
}

export const authService = {
    async login(credentials: LoginCredentials) {
        // Pull school_code out — it's a header, not a POST body field
        const { school_code, ...body } = credentials;
        const normalizedBody = {
            ...body,
            email: body.email?.trim().toLowerCase(),
            password: body.password,
        };

        // Determine tenant: explicit school_code > subdomain detection > 'public'
        const tenantId = school_code?.trim() ||
            (typeof window !== 'undefined'
                ? getTenantFromSubdomain(window.location.hostname)
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

        if (response.data.tokens?.access) {
            setTokens(response.data.tokens.access, response.data.tokens.refresh, { tenantId });
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
