/**
 * POST /api/auth/refresh
 * Обновление пары токенов по refresh token из cookie
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyRefreshToken, generateAccessToken, generateRefreshToken, setRefreshTokenCookie, deleteRefreshTokenCookie, getRefreshTokenCookie } from "@/lib/auth/jwt";
import { checkRateLimitByIP, getClientIP, AUTH_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { internalError } from "@/lib/api/helpers";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const ip = getClientIP(request);
  try {
    const rateLimit = checkRateLimitByIP(ip, AUTH_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Попробуйте позже." },
        { status: 429 },
      );
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
      logSecurity("auth.refresh.user_not_found", { requestId, ip, userId: payload.userId });
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 401 },
      );
    }

    if (session.user.isBlocked && session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      await deleteRefreshTokenCookie();
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

    // Обновляем сессию в БД
    await db.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // обновляем срок
      },
    });

    // Сохраняем новый refresh token в cookie
    await setRefreshTokenCookie(newRefreshToken);

    logSecurity("auth.refresh.success", { requestId, ip, userId: session.user.id });
    return NextResponse.json(
      {
        accessToken: newAccessToken,
      },
      { status: 200 },
    );
  } catch (error) {
    logError("auth.refresh.error", error, { requestId, ip });
    await deleteRefreshTokenCookie();
    return internalError("Ошибка при обновлении токена");
  }
}
