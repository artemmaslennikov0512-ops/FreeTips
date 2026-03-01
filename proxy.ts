import { NextRequest, NextResponse } from "next/server";
import { checkRateLimitByIP, getClientIP } from "@/lib/middleware/rate-limit";
import { REQUEST_ID_HEADER } from "@/lib/security/request";
import {
  CSRF_COOKIE_NAME,
  CSRF_COOKIE_PATH,
  CSRF_HEADER_NAME,
  CSRF_TOKEN_TTL_SECONDS,
  generateCsrfToken,
} from "@/lib/security/csrf";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const API_PREFIX = "/api";
const CSRF_EXEMPT_PREFIXES = ["/api/payment/webhook", "/api/pay/redirect-proxy", "/api/v1/webhooks/paygine"];
const JSON_CONTENT_TYPE = "application/json";
const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const API_RATE_WINDOW_MS = 15 * MINUTE_MS;
const API_RATE_LIMIT_MAX = 400;
const HSTS_MAX_AGE_SECONDS = 15552000;
const RATE_LIMIT_OPTIONS = {
  windowMs: API_RATE_WINDOW_MS,
  maxRequests: API_RATE_LIMIT_MAX,
  keyPrefix: "api",
};

function isApiRequest(pathname: string): boolean {
  return pathname.startsWith(API_PREFIX);
}

function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method);
}

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function hasBearerAuth(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return Boolean(auth?.startsWith("Bearer "));
}

function getRequestId(request: NextRequest): string {
  return request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
}

function getCsrfCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
}

function isLocalhostHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const requestHost = request.headers.get("x-forwarded-host") ?? request.nextUrl.host;
    const originHost = originUrl.host;
    if (originUrl.origin === request.nextUrl.origin) return true;
    if (originHost === requestHost) return true;
    if (isLocalhostHost(originUrl.hostname) && isLocalhostHost(request.nextUrl.hostname)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isJsonRequest(request: NextRequest): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.startsWith(JSON_CONTENT_TYPE);
}

function shouldCheckCsrf(request: NextRequest, pathname: string): boolean {
  if (!isApiRequest(pathname)) return false;
  if (isSafeMethod(request.method)) return false;
  if (hasBearerAuth(request)) return false;
  return !isCsrfExempt(pathname);
}

/**
 * CSP: 'unsafe-inline' для script/style требуется Next.js для инлайновых скриптов/стилей.
 * В production unsafe-eval не используется (только в dev для HMR).
 */
function buildCsp(isDev: boolean): string {
  const evalToken = isDev ? " 'unsafe-eval'" : "";
  const devConnect = isDev ? " ws:" : "";
  return [
    "default-src 'self'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `script-src 'self' 'unsafe-inline'${evalToken}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' https:${devConnect}`,
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self' https://test.paygine.com https://pay.paygine.com",
    "object-src 'none'",
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse, isDev: boolean): void {
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("x-xss-protection", "0"); // CSP достаточно; старый X-XSS-Protection отключён
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("permissions-policy", "geolocation=(), microphone=(), camera=()");
  response.headers.set("x-dns-prefetch-control", "off");
  response.headers.set("x-permitted-cross-domain-policies", "none");
  response.headers.set("content-security-policy", buildCsp(isDev));
  if (!isDev) {
    response.headers.set(
      "strict-transport-security",
      `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains; preload`,
    );
  }
}

function applyCsrfCookie(request: NextRequest, response: NextResponse): string {
  const existing = getCsrfCookie(request);
  if (existing) return existing;
  const token = generateCsrfToken();
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CSRF_TOKEN_TTL_SECONDS,
    path: CSRF_COOKIE_PATH,
  });
  return token;
}

function withJsonError(
  request: NextRequest,
  status: number,
  message: string,
  requestId: string,
): NextResponse {
  const response = NextResponse.json({ error: message }, { status });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  applySecurityHeaders(response, process.env.NODE_ENV !== "production");
  applyCsrfCookie(request, response);
  return response;
}

async function handleRateLimit(request: NextRequest, pathname: string, requestId: string): Promise<NextResponse | null> {
  if (!isApiRequest(pathname)) return null;
  const ip = getClientIP(request);
  const rateResult = await checkRateLimitByIP(ip, RATE_LIMIT_OPTIONS);
  if (rateResult.allowed) return null;
  return withJsonError(request, 429, "Слишком много запросов. Попробуйте позже.", requestId);
}

function handleCsrf(request: NextRequest, pathname: string, requestId: string): NextResponse | null {
  if (!shouldCheckCsrf(request, pathname)) return null;
  if (!isSameOrigin(request)) {
    return withJsonError(request, 403, "Запрос отклонён (origin)", requestId);
  }
  const csrfCookie = getCsrfCookie(request);
  const csrfHeader = request.headers.get(CSRF_HEADER_NAME);
  if (!csrfCookie || csrfHeader !== csrfCookie) {
    return withJsonError(request, 403, "Некорректный CSRF токен", requestId);
  }
  if (!isJsonRequest(request)) {
    return withJsonError(request, 415, "Ожидается application/json", requestId);
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const query = request.nextUrl.search || "";
  const method = request.method;
  const ts = new Date().toISOString();
  console.log(
    JSON.stringify({
      level: "REQUEST",
      method,
      path: pathname + query,
      timestamp: ts,
    }),
  );

  const requestId = getRequestId(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const rateLimitResponse = await handleRateLimit(request, pathname, requestId);
  if (rateLimitResponse) return rateLimitResponse;

  const csrfResponse = handleCsrf(request, pathname, requestId);
  if (csrfResponse) return csrfResponse;

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  applySecurityHeaders(response, process.env.NODE_ENV !== "production");
  applyCsrfCookie(request, response);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
