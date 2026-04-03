/**
 * DELETE /api/profile/sessions/[id] — завершить одну сессию (свою).
 * Если это текущая сессия — сбрасывается refresh cookie (как выход).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { deleteRefreshTokenCookie, getRefreshTokenCookie } from "@/lib/auth/jwt";
import { jsonError, internalError } from "@/lib/api/helpers";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { getClientIP } from "@/lib/middleware/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const requestId = getRequestId(request);
  const ip = getClientIP(request);
  try {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    if (!id || id.length < 8) {
      return jsonError(400, "Некорректный идентификатор");
    }

    const session = await db.session.findFirst({
      where: { id, userId: auth.user.userId },
    });
    if (!session) {
      return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
    }

    const currentRefresh = await getRefreshTokenCookie();
    const isCurrent = Boolean(currentRefresh && session.refreshToken === currentRefresh);

    await db.session.delete({ where: { id: session.id } });

    if (isCurrent) {
      await deleteRefreshTokenCookie();
    }

    logSecurity("profile.sessions.revoke_one", {
      requestId,
      ip,
      userId: auth.user.userId,
      sessionId: session.id,
      wasCurrent: isCurrent,
    });

    return NextResponse.json({ ok: true, endedCurrentSession: isCurrent });
  } catch (e) {
    logError("profile.sessions.delete", e, { requestId, ip });
    return internalError("Не удалось завершить сессию");
  }
}
