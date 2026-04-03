/**
 * GET /api/profile/sessions — активные сессии (refresh не истёк).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { getRefreshTokenCookie } from "@/lib/auth/jwt";
import { internalError } from "@/lib/api/helpers";
import { logError } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { toProfileSessionListItem } from "@/lib/profile-sessions-dto";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;

    const now = new Date();
    const currentRefresh = await getRefreshTokenCookie();

    const rows = await db.session.findMany({
      where: {
        userId: auth.user.userId,
        expiresAt: { gt: now },
      },
      orderBy: { lastSeenAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        lastSeenAt: true,
        expiresAt: true,
        deviceInfo: true,
        refreshToken: true,
      },
    });

    const items = rows.map((r) => toProfileSessionListItem(r, currentRefresh));

    return NextResponse.json({ sessions: items });
  } catch (e) {
    logError("profile.sessions.list", e, { requestId });
    return internalError("Не удалось загрузить сессии");
  }
}
