/**
 * POST /api/auth/reset-password
 * Сброс пароля по одноразовой ссылке (токен из письма «Забыли пароль»).
 * Body: { token, newPassword, newPasswordConfirm }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations";
import { hashPasswordResetToken } from "@/lib/auth/password-reset-token";
import { hashPassword } from "@/lib/auth/password";
import { checkRateLimitByIP, getClientIP, AUTH_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError } from "@/lib/api/helpers";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const ip = getClientIP(request);

  try {
    const rateLimit = await checkRateLimitByIP(ip, AUTH_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Попробуйте позже." },
        { status: 429 },
      );
    }
    if (!verifyCsrfFromRequest(request)) {
      return NextResponse.json({ error: "Некорректный CSRF токен" }, { status: 403 });
    }

    const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
    if (!parsed.ok) return parsed.response;
    const validated = resetPasswordSchema.safeParse(parsed.data);
    if (!validated.success) {
      return jsonError(400, "Неверные данные", validated.error.issues, { hideDetailsInProduction: true });
    }

    const { token, newPassword } = validated.data;
    const tokenHash = hashPasswordResetToken(token);
    const now = new Date();

    const resetRecord = await db.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true } } },
    });

    if (!resetRecord || resetRecord.expiresAt < now) {
      return NextResponse.json(
        { error: "Ссылка недействительна или истекла. Запросите сброс пароля заново." },
        { status: 400 },
      );
    }

    const userId = resetRecord.user.id;
    const newHash = await hashPassword(newPassword);

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newHash, mustChangePassword: false },
      });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
    });

    logSecurity("auth.reset_password.success", { requestId, ip, userId });
    return NextResponse.json({ success: true, message: "Пароль успешно изменён. Войдите с новым паролем." });
  } catch (error) {
    logError("auth.reset_password.error", error, { requestId, ip });
    return internalError("Ошибка сброса пароля");
  }
}
