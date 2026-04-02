/**
 * POST /api/admin/totp/cancel
 * Отмена незавершённой привязки (секрет есть, подтверждение кода ещё не прошло).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { jsonError, internalError } from "@/lib/api/helpers";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireRole(["ADMIN", "SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const userId = auth.user.userId;

  try {
    const row = await db.user.findUnique({
      where: { id: userId },
      select: { adminTotpEnabled: true, adminTotpSecretEnc: true },
    });

    if (!row?.adminTotpSecretEnc) {
      return jsonError(400, "Нет незавершённой привязки.");
    }

    if (row.adminTotpEnabled) {
      return jsonError(400, "2FA уже включена. Используйте отключение с паролем и кодом.");
    }

    await db.user.update({
      where: { id: userId },
      data: { adminTotpSecretEnc: null },
    });

    logSecurity("admin.totp.cancel", { requestId, userId });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    logError("admin.totp.cancel.error", err, { requestId, userId });
    return internalError("Не удалось отменить настройку");
  }
}
