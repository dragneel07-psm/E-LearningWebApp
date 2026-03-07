// lib/auth.ts
import { jwtDecode } from "jwt-decode";
import { UserProfile } from "@/types/auth"; // Try to infer from token

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

        // Set cookie for middleware/server accessibility
        const isSecure = window.location.protocol === 'https:';
        const useSharedDomain = shouldUseSharedManyaltechDomain(options?.tenantId);
        const commonAttrs = `path=/; ${isSecure ? 'secure; ' : ''}samesite=lax`;

        // Always set a host-scoped cookie so middleware can read it reliably.
        document.cookie = `access_token=${access}; ${commonAttrs}`;

        // On SaaS apex/www hosts, also set a shared domain cookie to keep auth state
        // consistent across manyaltech.com and www.manyaltech.com.
        if (useSharedDomain) {
            document.cookie = `access_token=${access}; path=/; domain=.manyaltech.com; ${isSecure ? 'secure; ' : ''}samesite=lax`;
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
