// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from "jwt-decode";

interface UserPayload {
    user_id: string;
    username: string;
    role: 'student' | 'teacher' | 'parent' | 'admin' | 'saas_admin';
    tenant_id: string;
    exp: number;
}

const PUBLIC_PATHS = ['/login', '/public'];

export function middleware(request: NextRequest) {
    const { pathname, hostname } = request.nextUrl;

    // 1. Tenant Handling (Mocked for now)
    // We can attach tenant info to headers
    const requestHeaders = new Headers(request.headers);
    const tenantSubdomain = hostname.split('.')[0];
    requestHeaders.set('x-tenant-id', tenantSubdomain);

    // 2. Auth Handling
    const token = request.cookies.get('auth_token')?.value;

    // Allow access to public paths
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
        return NextResponse.next({
            request: {
                headers: requestHeaders,
            }
        });
    }

    // Redirect to login if no token
    if (!token) {
        if (pathname.startsWith('/saas')) {
            return NextResponse.redirect(new URL('/login/saas', request.url));
        }
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 3. Role-Based Redirects
    try {
        const user = jwtDecode<UserPayload>(token);
        const userRole = user.role?.toLowerCase();

        // Check expiration
        if (user.exp * 1000 < Date.now()) {
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('auth_token');
            return response;
        }

        // Role protection logic
        if (pathname.startsWith('/admin') && userRole !== 'admin' && userRole !== 'saas_admin') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        if (pathname.startsWith('/saas') && userRole !== 'saas_admin') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        if (pathname.startsWith('/student') && userRole !== 'student') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        if (pathname.startsWith('/teacher') && userRole !== 'teacher') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        if (pathname.startsWith('/parent') && userRole !== 'parent') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }

        // Root redirect to role dashboard
        if (pathname === '/') {
            let target = '/student'; // Default fallback
            if (userRole === 'teacher') target = '/teacher';
            if (userRole === 'parent') target = '/parent';
            if (userRole === 'admin') target = '/admin';
            if (userRole === 'saas_admin') target = '/saas';
            return NextResponse.redirect(new URL(target, request.url));
        }

    } catch {
        // Invalid token
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        }
    });
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
