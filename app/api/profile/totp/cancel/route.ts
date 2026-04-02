/**
 * POST /api/profile/totp/cancel — отмена незавершённой привязки.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { jsonError, internalError } from "@/lib/api/helpers";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const userId = auth.user.userId;

  try {
    const row = await db.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true, totpSecretEnc: true },
    });

    if (!row?.totpSecretEnc) {
      return jsonError(400, "Нет незавершённой привязки.");
    }

    if (row.totpEnabled) {
      return jsonError(400, "2FA уже включена. Используйте отключение с паролем и кодом.");
    }

    await db.user.update({
      where: { id: userId },
      data: { totpSecretEnc: null },
    });

    logSecurity("profile.totp.cancel", { requestId, userId });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    logError("profile.totp.cancel.error", err, { requestId, userId });
    return internalError("Не удалось отменить настройку");
  }
}
