/**
 * POST /api/profile/totp/start
 * Начало привязки Google Authenticator (любой авторизованный пользователь).
 */

import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { encryptTotpSecret } from "@/lib/auth/totp-crypto";
import { buildUserOtpauthUri, generateTotpSecretBase32 } from "@/lib/auth/user-totp";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { jsonError, internalError } from "@/lib/api/helpers";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const userId = auth.user.userId;

  try {
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { login: true, totpEnabled: true },
    });

    if (!existing) {
      return jsonError(404, "Пользователь не найден");
    }

    if (existing.totpEnabled) {
      return jsonError(400, "Двухфакторная аутентификация уже включена. Сначала отключите её.");
    }

    const secretBase32 = generateTotpSecretBase32();
    const enc = encryptTotpSecret(secretBase32);
    await db.user.update({
      where: { id: userId },
      data: { totpSecretEnc: enc, totpEnabled: false },
    });

    const otpauthUrl = buildUserOtpauthUri(existing.login, secretBase32);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 1 });

    logSecurity("profile.totp.start", { requestId, userId });
    return NextResponse.json({ otpauthUrl, qrDataUrl }, { status: 200 });
  } catch (err) {
    logError("profile.totp.start.error", err, { requestId, userId });
    return internalError("Не удалось подготовить привязку");
  }
}
