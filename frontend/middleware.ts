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
    '/debug-auth'
];

export async function middleware(request: NextRequest) {
    const { pathname, hostname } = request.nextUrl;

    // 1. Tenant Handling (Pass subdomain to headers)
    const requestHeaders = new Headers(request.headers);
    const tenantSubdomain = hostname.split('.')[0];
    requestHeaders.set('x-tenant-id', tenantSubdomain);

    // 2. Auth Handling
    const token = request.cookies.get('access_token')?.value;

    // Allow access to public paths
    if (pathname === '/' || PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
        // If logged in and at root or login/register, perform dashboard redirect
        if (token && (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register'))) {
            // Decoded and redirected in next block
        } else {
            return NextResponse.next({
                request: { headers: requestHeaders }
            });
        }
    }

    // Redirect to login if no token on protected routes
    if (!token) {
        console.log('[Middleware] No token found, redirecting to login');
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 3. Role & Expiry Check
    try {
        let user: UserPayload;

        // In production, we MUST verify the JWT signature using the backend's secret key.
        // During local dev, if no secret is provided, fallback to decoding (NOT SECURE FOR PROD).
        const jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret) {
            const secretKey = new TextEncoder().encode(jwtSecret);
            const { payload } = await jwtVerify(token, secretKey);
            user = payload as unknown as UserPayload;
        } else {
            user = decodeJwt(token) as UserPayload;
        }

        const userRole = (user.role || 'student').toLowerCase();
        console.log(`[Middleware] Parsed User: role=${userRole}, exp=${user.exp}`);

        // Check expiration
        if (user.exp && user.exp * 1000 < Date.now()) {
            console.log(`[Middleware] Token expired (exp ${user.exp * 1000} < now ${Date.now()})`);
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('access_token');
            response.cookies.delete('refresh_token');
            return response;
        }

        // Role Protection Logic
        if (pathname.startsWith('/admin') && userRole !== 'admin') {
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
                teacher: '/teacher',
                student: '/student',
                saas_admin: '/saas',
                parent: '/parent'
            };
            const target = dashboardMap[userRole] || '/student';
            return NextResponse.redirect(new URL(target, request.url));
        }

    } catch (e) {
        console.error('[Middleware] JWT Decode/Verify error:', e);
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('access_token');
        return response;
    }

    return NextResponse.next({
        request: { headers: requestHeaders }
    });
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
