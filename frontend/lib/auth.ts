// lib/auth.ts
import { jwtDecode } from "jwt-decode";

export interface UserPayload {
    user_id: string;
    username: string;
    role: string;
    // tenant_id: string; // If implemented
    exp: number;
    // email? check JWT content
}

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

type SetTokenOptions = {
    tenantId?: string;
};

function shouldUseSharedManyaltechDomain(tenantId?: string): boolean {
    if (typeof window === 'undefined') return false;
    if (tenantId !== 'public') return false;

    const host = (window.location.hostname || '').trim().toLowerCase();
    return host === 'manyaltech.com' || host === 'www.manyaltech.com';
}

export const setTokens = (access: string, refresh: string, options?: SetTokenOptions) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(ACCESS_KEY, access);
        localStorage.setItem(REFRESH_KEY, refresh);
        const encodedAccess = encodeURIComponent(access);

        // Set cookie for middleware/server accessibility
        const isSecure = window.location.protocol === 'https:';
        const useSharedDomain = shouldUseSharedManyaltechDomain(options?.tenantId);
        const secureAttr = isSecure ? 'secure; ' : '';

        if (useSharedDomain) {
            // Canonical public SaaS cookie: shared domain only.
            // Clear host-scoped value first to avoid duplicate-cookie redirect loops.
            document.cookie = `access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            document.cookie = `access_token=${encodedAccess}; path=/; domain=.manyaltech.com; ${secureAttr}samesite=lax`;
        } else {
            // Canonical tenant/local cookie: host-scoped only.
            // Clear shared-domain value to avoid stale conflicts.
            document.cookie = `access_token=; path=/; domain=.manyaltech.com; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            document.cookie = `access_token=${encodedAccess}; path=/; ${secureAttr}samesite=lax`;
        }
    }
};

export const getAccessToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(ACCESS_KEY);
    }
    return null;
};

export const getRefreshToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(REFRESH_KEY);
    }
    return null;
};

export const removeTokens = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem('tenant_id');

        // Clear cookie
        document.cookie = `access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `access_token=; path=/; domain=.manyaltech.com; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `tenant_id=; path=/; domain=.manyaltech.com; expires=Thu, 01 Jan 1970 00:00:00 GMT`;

        console.log('[Auth] Tokens removed');
    }
};

export const getUser = (): UserPayload | null => {
    const token = getAccessToken();
    if (!token) return null;
    try {
        return jwtDecode<UserPayload>(token);
    } catch {
        return null;
    }
};

export const isAuthenticated = (): boolean => {
    const user = getUser();
    // Check if expired
    if (!user) return false;
    return user.exp * 1000 > Date.now();
};
