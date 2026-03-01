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

export const authService = {
    async login(credentials: LoginCredentials) {
        // Pull school_code out — it's a header, not a POST body field
        const { school_code, ...body } = credentials;

        // Determine tenant: explicit school_code > subdomain detection > 'public'
        const tenantId = school_code?.trim() ||
            (typeof window !== 'undefined'
                ? getTenantFromSubdomain(window.location.hostname)
                : null) ||
            'public';

        const response = await api.post<LoginResponse>('/api/users/login/', body, {
            headers: { 'x-tenant-id': tenantId },
        });

        if (response.data.access && response.data.refresh) {
            setTokens(response.data.access, response.data.refresh);
            // Cache school_code so subsequent requests use the right tenant
            if (typeof window !== 'undefined') {
                localStorage.setItem('tenant_id', tenantId);
                if (response.data.user?.role) {
                    localStorage.setItem('user_role', response.data.user.role);
                }
            }
        }
        return response.data;
    },

    async register(data: RegisterData) {
        // Determine tenant: subdomain detection > 'public'
        const tenantId = (typeof window !== 'undefined'
            ? getTenantFromSubdomain(window.location.hostname)
            : null) || 'public';

        const response = await api.post<RegisterResponse>('/api/users/register/', data, {
            headers: { 'x-tenant-id': tenantId },
        });

        if (response.data.tokens?.access) {
            setTokens(response.data.tokens.access, response.data.tokens.refresh);
            if (typeof window !== 'undefined') {
                localStorage.setItem('tenant_id', tenantId);
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
