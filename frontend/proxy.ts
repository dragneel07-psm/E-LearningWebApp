import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeJwt, jwtVerify } from 'jose';

interface UserPayload {
    user_id: string;
    username: string;
    role: string;
    exp: number;
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

function getUserFromToken(token: string): UserPayload | null {
    try {
        const decoded = decodeJwt(token) as Partial<UserPayload>;
        if (!decoded || typeof decoded !== 'object') return null;

        return {
            user_id: String(decoded.user_id || ''),
            username: String(decoded.username || ''),
            role: String(decoded.role || 'student'),
            exp: Number(decoded.exp || 0),
        };
    } catch {
        return null;
    }
}

function getLatestCookieValue(request: NextRequest, name: string): string | undefined {
    const allValues = request.cookies.getAll(name)
        .map((item) => item.value)
        .filter((value) => Boolean(value && value.trim()));
    if (allValues.length === 0) return undefined;
    return allValues[allValues.length - 1];
}

export async function proxy(request: NextRequest) {
    const { pathname, hostname } = request.nextUrl;

    // 1. Tenant Handling (Pass subdomain to headers)
    const requestHeaders = new Headers(request.headers);
    const tenantSubdomain = getTenantFromHostname(hostname);
    requestHeaders.set('x-tenant-id', tenantSubdomain || 'public');

    // 2. Auth Handling
    const token = getLatestCookieValue(request, 'access_token');

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
        let user: UserPayload | null = getUserFromToken(token);

        // Prefer signature verification when secret is configured.
        // If verification cannot run (e.g. env mismatch), keep decoded payload as fallback.
        const jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret) {
            try {
                const secretKey = new TextEncoder().encode(jwtSecret);
                const { payload } = await jwtVerify(token, secretKey);
                user = payload as unknown as UserPayload;
            } catch {
                // Keep decoded fallback to avoid login loops from transient/env issues.
            }
        }

        if (!user || !user.exp || !user.role) {
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
