/**
 * POST /api/auth/refresh
 * Обновление пары токенов по refresh token из cookie.
 * Требует валидный CSRF (заголовок + cookie), как и остальные state-changing auth POST.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  deleteAccessTokenCookie,
  deleteRefreshTokenCookie,
  getRefreshTokenCookie,
} from "@/lib/auth/jwt";
import { checkRateLimitByIP, getClientIpAndRateLimitKey, AUTH_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { mergeSessionDeviceInfo, readDeviceClientIdFromRequest } from "@/lib/auth-session-metadata";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { internalError, jsonError, rateLimit429Response } from "@/lib/api/helpers";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const { ip, rateLimitKey } = getClientIpAndRateLimitKey(request);
  try {
    const rateLimit = await checkRateLimitByIP(rateLimitKey, AUTH_RATE_LIMIT);
    if (!rateLimit.allowed) return rateLimit429Response(rateLimit);

    if (!verifyCsrfFromRequest(request)) {
      return jsonError(403, "Некорректный CSRF токен");
    }

    // Получаем refresh token из cookie
    const refreshToken = await getRefreshTokenCookie();
    if (!refreshToken) {
      logSecurity("auth.refresh.missing_cookie", { requestId, ip });
      return NextResponse.json(
        { error: "Refresh token не найден" },
        { status: 401 },
      );
    }

    // Валидируем refresh token
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload || !payload.userId) {
      await deleteRefreshTokenCookie();
      await deleteAccessTokenCookie();
      logSecurity("auth.refresh.invalid_token", { requestId, ip });
      return NextResponse.json(
        { error: "Недействительный refresh token" },
        { status: 401 },
      );
    }

    // Проверяем, что сессия существует в БД
    const session = await db.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      await deleteRefreshTokenCookie();
      await deleteAccessTokenCookie();
      // Удаляем истёкшую сессию
      await db.session.deleteMany({
        where: { refreshToken },
      });
      logSecurity("auth.refresh.expired_session", { requestId, ip, userId: payload.userId });
      return NextResponse.json(
        { error: "Сессия истекла" },
        { status: 401 },
      );
    }

    // Проверяем, что пользователь существует
    if (!session.user) {
      await deleteRefreshTokenCookie();
      await deleteAccessTokenCookie();
      logSecurity("auth.refresh.user_not_found", { requestId, ip, userId: payload.userId });
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 401 },
      );
    }

    if (session.user.isBlocked && session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      await deleteRefreshTokenCookie();
      await deleteAccessTokenCookie();
      await db.session.deleteMany({ where: { userId: session.user.id } });
      logSecurity("auth.refresh.blocked", { requestId, ip, userId: session.user.id });
      return NextResponse.json(
        { error: "Доступ к личному кабинету ограничен" },
        { status: 403 },
      );
    }

    const tokenPayload = {
      userId: session.user.id,
      login: session.user.login,
      role: session.user.role,
    };

    const newAccessToken = await generateAccessToken(tokenPayload);
    const newRefreshToken = await generateRefreshToken(tokenPayload);

    const deviceClientId = readDeviceClientIdFromRequest(request);
    const deviceInfo = mergeSessionDeviceInfo(session.deviceInfo, request, ip, deviceClientId);

    // Обновляем сессию в БД
    await db.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // обновляем срок
        lastSeenAt: new Date(),
        deviceInfo,
      },
    });

    await setRefreshTokenCookie(newRefreshToken);
    await setAccessTokenCookie(newAccessToken);

    logSecurity("auth.refresh.success", { requestId, ip, userId: session.user.id });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logError("auth.refresh.error", error, { requestId, ip });
    await deleteRefreshTokenCookie();
    await deleteAccessTokenCookie();
    return internalError("Ошибка при обновлении токена");
  }
}
