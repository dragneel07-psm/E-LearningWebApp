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

export const setTokens = (access: string, refresh: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(ACCESS_KEY, access);
        localStorage.setItem(REFRESH_KEY, refresh);

        // Set cookie for middleware/server accessibility
        const isSecure = window.location.protocol === 'https:';

        // Don't set domain for localhost - let the browser handle it per host
        // This allows cookies to work on localhost, demo.localhost, etc. independently
        const cookieString = `access_token=${access}; path=/; ${isSecure ? 'secure;' : ''} samesite=lax`;

        document.cookie = cookieString;
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

        // Clear cookie
        document.cookie = `access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;

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
