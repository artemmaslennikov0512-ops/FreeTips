/**
 * POST /api/auth/logout
 * Выход: инвалидирует refresh token (удаляет сессию и cookie)
 * Для запросов без Bearer требуется валидный CSRF (защита от выхода с другого сайта).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRefreshTokenCookie, deleteRefreshTokenCookie } from "@/lib/auth/jwt";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { getClientIP } from "@/lib/middleware/rate-limit";
import { internalError } from "@/lib/api/helpers";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";

function hasBearer(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return Boolean(auth?.startsWith("Bearer "));
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const ip = getClientIP(request);

  if (!hasBearer(request) && !verifyCsrfFromRequest(request)) {
    return NextResponse.json({ error: "Некорректный CSRF токен" }, { status: 403 });
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

    // Удаляем cookie
    await deleteRefreshTokenCookie();

    logSecurity("auth.logout.success", { requestId, ip });
    return NextResponse.json(
      { message: "Выход выполнен успешно" },
      { status: 200 },
    );
  } catch (error) {
    logError("auth.logout.error", error, { requestId, ip });
    await deleteRefreshTokenCookie();
    return internalError("Ошибка при выходе");
  }
}
