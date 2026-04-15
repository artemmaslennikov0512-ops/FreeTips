/**
 * POST /api/auth/logout
 * Выход: инвалидирует refresh token (удаляет сессию и cookie)
 * Для запросов без Bearer требуется валидный CSRF (защита от выхода с другого сайта).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRefreshTokenCookie, deleteRefreshTokenCookie, deleteAccessTokenCookie } from "@/lib/auth/jwt";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { getClientIP } from "@/lib/middleware/rate-limit";
import { internalError, jsonError } from "@/lib/api/helpers";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { hasAuthorizationBearer } from "@/lib/auth/bearer-from-request";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const ip = getClientIP(request);

  if (!hasAuthorizationBearer(request) && !verifyCsrfFromRequest(request)) {
    return jsonError(403, "Некорректный CSRF токен");
  }

  try {
    // Получаем refresh token из cookie
    const refreshToken = await getRefreshTokenCookie();

    if (refreshToken) {
      // Удаляем сессию из БД
      await db.session.deleteMany({
        where: { refreshToken },
      });
    }

    await deleteRefreshTokenCookie();
    await deleteAccessTokenCookie();

    logSecurity("auth.logout.success", { requestId, ip });
    return NextResponse.json(
      { message: "Выход выполнен успешно" },
      { status: 200 },
    );
  } catch (error) {
    logError("auth.logout.error", error, { requestId, ip });
    await deleteRefreshTokenCookie();
    await deleteAccessTokenCookie();
    return internalError("Ошибка при выходе");
  }
}
