/**
 * POST /api/admin/totp/disable
 * Отключение TOTP: пароль + текущий код из приложения.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { getUserRepository } from "@/lib/infrastructure/user-repository";
import { adminTotpDisableSchema } from "@/lib/validations";
import { verifyPassword } from "@/lib/auth/password";
import { verifyTotpWithEncryptedSecret } from "@/lib/auth/admin-totp";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError, zodErrorResponse } from "@/lib/api/helpers";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireRole(["ADMIN", "SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const userId = auth.user.userId;

  try {
    const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
    if (!parsed.ok) return parsed.response;
    const validated = adminTotpDisableSchema.safeParse(parsed.data);
    if (!validated.success) return zodErrorResponse(validated.error);

    const userRepo = getUserRepository();
    const creds = await userRepo.findById(userId);
    if (!creds) {
      return jsonError(404, "Пользователь не найден");
    }

    const okPassword = await verifyPassword(validated.data.password, creds.passwordHash);
    if (!okPassword) {
      logSecurity("admin.totp.disable.bad_password", { requestId, userId });
      return jsonError(401, "Неверный пароль");
    }

    const row = await db.user.findUnique({
      where: { id: userId },
      select: { adminTotpEnabled: true, adminTotpSecretEnc: true },
    });

    if (!row?.adminTotpEnabled || !row.adminTotpSecretEnc) {
      return jsonError(400, "Двухфакторная аутентификация не включена.");
    }

    if (!verifyTotpWithEncryptedSecret(row.adminTotpSecretEnc, validated.data.code)) {
      logSecurity("admin.totp.disable.bad_code", { requestId, userId });
      return jsonError(401, "Неверный код");
    }

    await db.user.update({
      where: { id: userId },
      data: { adminTotpEnabled: false, adminTotpSecretEnc: null },
    });

    logSecurity("admin.totp.disable.ok", { requestId, userId });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    logError("admin.totp.disable.error", err, { requestId, userId });
    return internalError("Не удалось отключить 2FA");
  }
}
