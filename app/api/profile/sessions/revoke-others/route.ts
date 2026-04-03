/**
 * POST /api/profile/sessions/revoke-others — завершить все сессии, кроме текущей (по refresh cookie).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { getRefreshTokenCookie } from "@/lib/auth/jwt";
import { jsonError, internalError } from "@/lib/api/helpers";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { getClientIP } from "@/lib/middleware/rate-limit";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const ip = getClientIP(request);
  try {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;

    const currentRefresh = await getRefreshTokenCookie();
    if (!currentRefresh) {
      return jsonError(400, "Не удалось определить текущую сессию. Войдите снова.");
    }

    const current = await db.session.findFirst({
      where: { userId: auth.user.userId, refreshToken: currentRefresh, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!current) {
      return jsonError(400, "Текущая сессия недействительна. Войдите снова.");
    }

    const result = await db.session.deleteMany({
      where: {
        userId: auth.user.userId,
        refreshToken: { not: currentRefresh },
      },
    });

    logSecurity("profile.sessions.revoke_others", {
      requestId,
      ip,
      userId: auth.user.userId,
      revokedCount: result.count,
    });

    return NextResponse.json({ revokedCount: result.count });
  } catch (e) {
    logError("profile.sessions.revoke_others", e, { requestId, ip });
    return internalError("Не удалось завершить сессии");
  }
}
