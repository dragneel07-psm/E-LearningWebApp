import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function getTenantSubdomain(hostname: string): string | null {
    const host = hostname.split(':')[0].toLowerCase().trim()
    if (!host) return null
    if (host === 'localhost' || host === '127.0.0.1') return null

    const parts = host.split('.')

    // demo.localhost style (local dev with tenant prefix)
    if (parts[parts.length - 1] === 'localhost') {
        return parts.length > 1 && parts[0] !== 'localhost' ? parts[0] : null
    }

    // Skip managed hosting roots (no tenant inference from app name)
    const managed = ['.vercel.app', '.railway.app', '.netlify.app', '.up.railway.app']
    if (managed.some(s => host.endsWith(s))) return null

    // tenant.example.com → tenant
    if (parts.length >= 3 && parts[0] !== 'www') return parts[0]

    return null
}

export function middleware(request: NextRequest) {
    const hostname = request.headers.get('host') || ''
    const tenant = getTenantSubdomain(hostname)
    const { pathname } = request.nextUrl

    // Rewrite root to /school for tenant subdomains
    if (tenant && pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/school'
        // Pass tenant id as header for the school page to read
        const res = NextResponse.rewrite(url)
        res.headers.set('x-tenant-id', tenant)
        return res
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
}
