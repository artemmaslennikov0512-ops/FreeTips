/**
 * POST /api/auth/login/totp
 * Второй шаг входа при включённом TOTP: twoFactorToken + 6-значный код.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loginTotpSchema } from "@/lib/validations";
import { generateAccessToken, generateRefreshToken, setRefreshTokenCookie, verifyTwoFactorPendingToken } from "@/lib/auth/jwt";
import { checkRateLimitByIP, getClientIP, AUTH_TOTP_VERIFY_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError, rateLimit429Response, zodErrorResponse } from "@/lib/api/helpers";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { z } from "zod";
import { verifyTotpWithEncryptedSecret } from "@/lib/auth/user-totp";
import { observeSharedAuthIp } from "@/lib/fraud-velocity-observe";
import { buildNewSessionMetadata } from "@/lib/auth-session-metadata";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const ip = getClientIP(request);
  try {
    const rateLimit = await checkRateLimitByIP(ip, AUTH_TOTP_VERIFY_RATE_LIMIT);
    if (!rateLimit.allowed) return rateLimit429Response(rateLimit);
    if (!verifyCsrfFromRequest(request)) {
      return jsonError(403, "Некорректный CSRF токен");
    }

    const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
    if (!parsed.ok) return parsed.response;
    const validated = loginTotpSchema.parse(parsed.data);

    const pending = await verifyTwoFactorPendingToken(validated.twoFactorToken);
    if (!pending) {
      logSecurity("auth.login.totp.invalid_pending_token", { requestId, ip });
      return jsonError(401, "Сессия подтверждения истекла. Войдите снова.");
    }

    const user = await db.user.findUnique({
      where: { id: pending.userId },
      select: {
        id: true,
        login: true,
        email: true,
        role: true,
        mustChangePassword: true,
        isBlocked: true,
        totpEnabled: true,
        totpSecretEnc: true,
      },
    });

    if (!user) {
      return jsonError(401, "Пользователь не найден");
    }

    if (user.isBlocked && user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return jsonError(403, "Доступ к личному кабинету ограничен");
    }

    if (user.login !== pending.login || user.role !== pending.role) {
      logSecurity("auth.login.totp.user_mismatch", { requestId, ip, userId: user.id });
      return jsonError(401, "Некорректный токен подтверждения");
    }

    if (!user.totpEnabled || !user.totpSecretEnc) {
      return jsonError(400, "Двухфакторная аутентификация не включена");
    }

    if (!verifyTotpWithEncryptedSecret(user.totpSecretEnc, validated.code)) {
      logSecurity("auth.login.totp.wrong_code", { requestId, ip, userId: user.id });
      return jsonError(401, "Неверный код");
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastAuthIp: ip },
    });
    void observeSharedAuthIp(user.id, ip);

    const tokenPayload = {
      userId: user.id,
      login: user.login,
      role: user.role,
    };

    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);

    await setRefreshTokenCookie(refreshToken);

    const meta = buildNewSessionMetadata(request, ip, validated.deviceClientId);
    const fromMeta = JSON.parse(meta.deviceInfo) as {
      ip?: string;
      userAgent?: string;
      deviceClientId?: string;
    };
    await db.session.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceInfo: JSON.stringify({ ...fromMeta, totp: true }),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logSecurity("auth.login.success_after_2fa", { requestId, ip, userId: user.id });
    return NextResponse.json(
      {
        accessToken,
        user: {
          id: user.id,
          login: user.login,
          email: user.email,
          role: user.role,
        },
        mustChangePassword: user.mustChangePassword,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodErrorResponse(error);
    }
    logError("auth.login.totp.error", error, { requestId, ip });
    return internalError("Ошибка при входе");
  }
}
