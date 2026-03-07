import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeJwt, jwtVerify } from 'jose';

interface UserPayload {
    user_id: string;
    username: string;
    role: string;
    exp: number;
}

interface BackendUserProfile {
    user_id?: string;
    username?: string;
    role?: string;
}

const PUBLIC_PATHS = [
    '/login',
    '/register',
    '/public',
    '/forgot-password',
    '/debug-auth',
    '/manifest.json',
    '/sw.js',
    '/icons/'
];

function clearAuthCookies(response: NextResponse): void {
    const expiredAt = new Date(0);
    const baseOptions = { path: '/', expires: expiredAt };

    // Host-scoped cookies
    response.cookies.set('access_token', '', baseOptions);
    response.cookies.set('refresh_token', '', baseOptions);
    response.cookies.set('tenant_id', '', baseOptions);

    // Domain-scoped cookies (used for SaaS auth across apex/www)
    const sharedDomain = 'manyaltech.com';
    response.cookies.set('access_token', '', { ...baseOptions, domain: sharedDomain });
    response.cookies.set('refresh_token', '', { ...baseOptions, domain: sharedDomain });
    response.cookies.set('tenant_id', '', { ...baseOptions, domain: sharedDomain });
}

function getTenantFromHostname(hostname: string): string | null {
    const normalizedHost = (hostname || '').trim().toLowerCase();
    const parts = normalizedHost.split('.').filter(Boolean);

    if (!normalizedHost) return null;

    if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
        return 'localhost';
    }

    if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
        return parts[0] === 'localhost' ? 'localhost' : parts[0];
    }

    const managedHostSuffixes = [
        '.vercel.app',
        '.railway.app',
        '.up.railway.app',
    ];
    if (managedHostSuffixes.some((suffix) => normalizedHost.endsWith(suffix))) {
        return null;
    }

    if (parts.length > 2) {
        const label = parts[0];
        if (label === 'www') return null;
        return label;
    }

    return null;
}

function getBackendApiBaseUrl(request: NextRequest): string | null {
    const raw = (process.env.NEXT_PUBLIC_API_URL || '').trim();
    const rawNormalized = raw.toLowerCase();
    if (rawNormalized === '/api' || rawNormalized === 'api' || rawNormalized === 'same-origin' || rawNormalized === 'same_origin' || rawNormalized === 'relative') {
        return request.nextUrl.origin;
    }

    const candidates = raw.split(',').map((item) => item.trim()).filter(Boolean);
    const apiAbsoluteCandidate = candidates.find((item) => /^https?:\/\//i.test(item) && /\/api(\/|$)/i.test(item));
    let url = apiAbsoluteCandidate
        || candidates.find((item) => /^https?:\/\//i.test(item))
        || candidates.find((item) => !item.startsWith('/'))
        || raw;
    if (!url) return null;

    if (url.startsWith('/')) {
        return null;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }

    url = url.replace(/\/$/, '');
    if (url.endsWith('/api')) {
        url = url.slice(0, -4);
    }

    return url;
}

async function getUserFromBackend(request: NextRequest, token: string, tenantId: string): Promise<UserPayload | null> {
    const backendBase = getBackendApiBaseUrl(request);
    if (!backendBase) return null;

    try {
        const response = await fetch(`${backendBase}/api/users/accounts/me/`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'x-tenant-id': tenantId || 'public',
            },
            cache: 'no-store',
        });

        if (!response.ok) return null;

        const profile = await response.json() as BackendUserProfile;
        const decoded = decodeJwt(token) as Partial<UserPayload>;

        return {
            user_id: String(profile.user_id || decoded.user_id || ''),
            username: String(profile.username || decoded.username || ''),
            role: String(profile.role || decoded.role || 'student'),
            exp: Number(decoded.exp || 0),
        };
    } catch {
        return null;
    }
}

export async function proxy(request: NextRequest) {
    const { pathname, hostname } = request.nextUrl;

    // 1. Tenant Handling (Pass subdomain to headers)
    const requestHeaders = new Headers(request.headers);
    const tenantSubdomain = getTenantFromHostname(hostname);
    requestHeaders.set('x-tenant-id', tenantSubdomain || 'public');

    // 2. Auth Handling
    const token = request.cookies.get('access_token')?.value;

    // Allow access to public paths
    if (pathname === '/' || PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
        // If logged in and at root or login/register, perform dashboard redirect
        if (token && (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register'))) {
            // Decoded and redirected in next block
        } else if (!token && pathname === '/' && tenantSubdomain && tenantSubdomain !== 'localhost') {
            // Tenant subdomains should show school entry/login, not SaaS marketing root.
            return NextResponse.redirect(new URL('/login', request.url));
        } else {
            return NextResponse.next({
                request: { headers: requestHeaders }
            });
        }
    }

    // Redirect to login if no token on protected routes
    if (!token) {
        console.log('[Proxy] No token found, redirecting to login');
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 3. Role & Expiry Check
    try {
        let user: UserPayload | null = null;
        const tenantCookie = (request.cookies.get('tenant_id')?.value || '').trim().toLowerCase();
        const tenantForValidation = tenantCookie || tenantSubdomain || 'public';

        // Prefer local signature verification when secret is configured.
        // Fall back to backend validation so valid users are not logged out when envs drift.
        const jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret) {
            try {
                const secretKey = new TextEncoder().encode(jwtSecret);
                const { payload } = await jwtVerify(token, secretKey);
                user = payload as unknown as UserPayload;
            } catch {
                user = null;
            }
        }

        if (!user) {
            user = await getUserFromBackend(request, token, tenantForValidation);
        }

        if (!user) {
            throw new Error('Unable to validate access token');
        }

        const userRole = (user.role || 'student').toLowerCase();
        console.log(`[Proxy] Parsed User: role=${userRole}, exp=${user.exp}`);

        // Check expiration
        if (user.exp && user.exp * 1000 < Date.now()) {
            console.log(`[Proxy] Token expired (exp ${user.exp * 1000} < now ${Date.now()})`);
            const response = NextResponse.redirect(new URL('/login', request.url));
            clearAuthCookies(response);
            return response;
        }

        // Role Protection Logic
        if (pathname.startsWith('/admin') && userRole !== 'admin' && userRole !== 'staff') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        if (pathname.startsWith('/saas') && userRole !== 'saas_admin') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        if (pathname.startsWith('/teacher') && userRole !== 'teacher') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        if (pathname.startsWith('/student') && userRole !== 'student') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        if (pathname.startsWith('/parent') && userRole !== 'parent') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }

        // Root or Auth Redirect: Send logged-in user to their specific dashboard if they hit root, login, or register
        if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register')) {
            const dashboardMap: Record<string, string> = {
                admin: '/admin',
                staff: '/admin',
                teacher: '/teacher',
                student: '/student',
                saas_admin: '/saas',
                parent: '/parent'
            };
            const target = dashboardMap[userRole] || '/student';
            return NextResponse.redirect(new URL(target, request.url));
        }

    } catch (e) {
        console.error('[Proxy] JWT Decode/Verify error:', e);
        // Avoid login->login redirect loops when cookie is invalid/stale.
        if (pathname.startsWith('/login')) {
            const response = NextResponse.next({
                request: { headers: requestHeaders }
            });
            clearAuthCookies(response);
            return response;
        }
        const response = NextResponse.redirect(new URL('/login', request.url));
        clearAuthCookies(response);
        return response;
    }

    return NextResponse.next({
        request: { headers: requestHeaders }
    });
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|manifest.json|sw.js|favicon.ico|robots.txt|icons/).*)'],
};
