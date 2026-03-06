import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const HOP_BY_HOP_HEADERS = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "content-length",
]);

const SAME_ORIGIN_SENTINELS = new Set(["/api", "api", "same-origin", "same_origin", "relative"]);

function normalizeBackendOrigin(raw: string): string {
    const candidates = (raw || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const selected = candidates.find((item) => /^https?:\/\//i.test(item)) || "";
    if (!selected) return "";
    return selected.replace(/\/+$/, "").replace(/\/api$/i, "");
}

function resolveBackendOrigin(): string {
    const explicit = normalizeBackendOrigin(process.env.BACKEND_API_ORIGIN || process.env.API_PROXY_TARGET || "");
    if (explicit) return explicit;

    // Backward compatibility if someone mistakenly sets NEXT_PUBLIC_API_URL to absolute value.
    const fallback = (process.env.NEXT_PUBLIC_API_URL || "").trim().toLowerCase();
    if (SAME_ORIGIN_SENTINELS.has(fallback)) return "";
    return normalizeBackendOrigin(process.env.NEXT_PUBLIC_API_URL || "");
}

function buildTargetUrl(request: NextRequest, pathParts: string[]): URL | null {
    const backendOrigin = resolveBackendOrigin();
    if (!backendOrigin) return null;

    const base = `${backendOrigin}/`;
    const path = pathParts.length ? pathParts.join("/") : "";
    const targetUrl = new URL(`api/${path}`, base);
    targetUrl.search = request.nextUrl.search;
    return targetUrl;
}

function buildForwardHeaders(request: NextRequest): Headers {
    const headers = new Headers(request.headers);
    for (const header of HOP_BY_HOP_HEADERS) {
        headers.delete(header);
    }
    headers.delete("host");

    const originalHost = request.headers.get("host");
    if (originalHost) {
        headers.set("x-forwarded-host", originalHost);
    }
    headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
    return headers;
}

async function proxyRequest(request: NextRequest, pathParts: string[]): Promise<NextResponse> {
    const targetUrl = buildTargetUrl(request, pathParts);
    if (!targetUrl) {
        return NextResponse.json(
            {
                code: "backend_origin_missing",
                message: "Set BACKEND_API_ORIGIN (or API_PROXY_TARGET) to your Railway backend origin.",
            },
            { status: 500 },
        );
    }

    const method = request.method.toUpperCase();
    const hasBody = method !== "GET" && method !== "HEAD";
    const forwardHeaders = buildForwardHeaders(request);

    const upstreamResponse = await fetch(targetUrl, {
        method,
        headers: forwardHeaders,
        body: hasBody ? await request.arrayBuffer() : undefined,
        redirect: "manual",
        cache: "no-store",
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    for (const header of HOP_BY_HOP_HEADERS) {
        responseHeaders.delete(header);
    }
    return new NextResponse(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
    });
}

type RouteParams = { path?: string[] };
type RouteContext = { params: RouteParams | Promise<RouteParams> };

async function handle(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    const params = await Promise.resolve(context.params);
    const { path } = params;
    return proxyRequest(request, path || []);
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    return handle(request, context);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    return handle(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    return handle(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    return handle(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    return handle(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    return handle(request, context);
}
