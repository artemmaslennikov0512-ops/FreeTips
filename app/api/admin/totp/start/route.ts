/**
 * POST /api/admin/totp/start
 * Начало привязки Google Authenticator: генерирует секрет, сохраняет в БД (ожидание подтверждения кода).
 * Роли: ADMIN, SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { encryptTotpSecret } from "@/lib/auth/totp-crypto";
import { buildAdminOtpauthUri, generateTotpSecretBase32 } from "@/lib/auth/admin-totp";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { jsonError, internalError } from "@/lib/api/helpers";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireRole(["ADMIN", "SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const userId = auth.user.userId;

  try {
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { login: true, adminTotpEnabled: true },
    });

    if (!existing) {
      return jsonError(404, "Пользователь не найден");
    }

    if (existing.adminTotpEnabled) {
      return jsonError(400, "Двухфакторная аутентификация уже включена. Сначала отключите её.");
    }

    const secretBase32 = generateTotpSecretBase32();
    const enc = encryptTotpSecret(secretBase32);
    await db.user.update({
      where: { id: userId },
      data: { adminTotpSecretEnc: enc, adminTotpEnabled: false },
    });

    const otpauthUrl = buildAdminOtpauthUri(existing.login, secretBase32);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 1 });

    logSecurity("admin.totp.start", { requestId, userId });
    return NextResponse.json({ otpauthUrl, qrDataUrl }, { status: 200 });
  } catch (err) {
    logError("admin.totp.start.error", err, { requestId, userId });
    return internalError("Не удалось подготовить привязку");
  }
}
