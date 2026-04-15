/**
 * POST /api/auth/attach-access-cookie
 * Одноразовая миграция: валидный Bearer access (из устаревшего localStorage) → httpOnly-cookie `ft_access`.
 * Только заголовок Authorization — не cookie, чтобы не дублировать сессию из cookie в cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, setAccessTokenCookie } from "@/lib/auth/jwt";
import { getBearerTokenFromRequest } from "@/lib/auth/bearer-from-request";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { checkRateLimitByIP, getClientIpAndRateLimitKey, AUTH_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { jsonError, rateLimit429Response } from "@/lib/api/helpers";

export async function POST(request: NextRequest) {
  const { rateLimitKey } = getClientIpAndRateLimitKey(request);
  const rateLimit = await checkRateLimitByIP(rateLimitKey, AUTH_RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimit429Response(rateLimit);

  if (!verifyCsrfFromRequest(request)) {
    return jsonError(403, "Некорректный CSRF токен");
  }

  const raw = getBearerTokenFromRequest(request);
  if (!raw) {
    return jsonError(401, "Токен не предоставлен");
  }
  const payload = await verifyAccessToken(raw);
  if (!payload?.userId) {
    return jsonError(401, "Недействительный токен");
  }
  await setAccessTokenCookie(raw);
  return NextResponse.json({ ok: true }, { status: 200 });
}
