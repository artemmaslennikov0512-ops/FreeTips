/**
 * POST /api/admin/totp/verify
 * Подтверждение кода из приложения — включает TOTP для входа.
 * Body: { "code": "123456" }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { adminTotpCodeSchema } from "@/lib/validations";
import { decryptTotpSecret } from "@/lib/auth/totp-crypto";
import { verifyTotpCode } from "@/lib/auth/admin-totp";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError, zodErrorResponse } from "@/lib/api/helpers";
import { z } from "zod";

const bodySchema = z.object({ code: adminTotpCodeSchema });

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireRole(["ADMIN", "SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const userId = auth.user.userId;

  try {
    const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
    if (!parsed.ok) return parsed.response;
    const validated = bodySchema.safeParse(parsed.data);
    if (!validated.success) return zodErrorResponse(validated.error);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { adminTotpEnabled: true, adminTotpSecretEnc: true },
    });

    if (!user?.adminTotpSecretEnc) {
      return jsonError(400, "Сначала запустите привязку (кнопка «Начать настройку»).");
    }

    if (user.adminTotpEnabled) {
      return jsonError(400, "Двухфакторная аутентификация уже включена.");
    }

    const secret = decryptTotpSecret(user.adminTotpSecretEnc);
    if (!secret) {
      return internalError("Ошибка чтения ключа");
    }

    if (!verifyTotpCode(secret, validated.data.code)) {
      logSecurity("admin.totp.verify.fail", { requestId, userId });
      return jsonError(401, "Неверный код");
    }

    await db.user.update({
      where: { id: userId },
      data: { adminTotpEnabled: true },
    });

    logSecurity("admin.totp.verify.ok", { requestId, userId });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    logError("admin.totp.verify.error", err, { requestId, userId });
    return internalError("Не удалось подтвердить код");
  }
}
