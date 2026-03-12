/**
 * POST /api/auth/forgot-password
 * Запрос сброса пароля: логин (без учёта регистра) и email должны принадлежать одному аккаунту.
 * При неверном логине или email возвращается ошибка; ссылка отправляется только при совпадении.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forgotPasswordRequestSchema } from "@/lib/validations";
import { checkRateLimitByIP, getClientIP, AUTH_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError, rateLimit429Response } from "@/lib/api/helpers";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  getPasswordResetTokenExpiresAt,
} from "@/lib/auth/password-reset-token";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";
import { sendEmail } from "@/lib/email/send";
import { templatePasswordReset } from "@/lib/email/templates";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const ip = getClientIP(request);

  try {
    const rateLimit = await checkRateLimitByIP(ip, AUTH_RATE_LIMIT);
    if (!rateLimit.allowed) return rateLimit429Response(rateLimit);
    if (!verifyCsrfFromRequest(request)) {
      return NextResponse.json({ error: "Некорректный CSRF токен" }, { status: 403 });
    }

    const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
    if (!parsed.ok) return parsed.response;
    const validated = forgotPasswordRequestSchema.safeParse(parsed.data);
    if (!validated.success) {
      return jsonError(400, "Заполните все поля", validated.error.issues, { hideDetailsInProduction: true });
    }

    const { login, email } = validated.data;
    const emailNorm = email.trim().toLowerCase();
    const user = await db.user.findFirst({
      where: { login: { equals: login.trim(), mode: "insensitive" } },
      select: { id: true, email: true },
    });

    const emailMatch = user?.email && user.email.toLowerCase() === emailNorm;
    if (!user || !user.email || !emailMatch) {
      return NextResponse.json(
        { error: "Неверный логин или email. Проверьте данные и попробуйте снова." },
        { status: 400 },
      );
    }

    logSecurity("auth.forgot_password.request", { requestId, ip, userId: user.id });

    const token = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = getPasswordResetTokenExpiresAt();

    await db.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });
    });

    const baseUrl = getBaseUrlFromRequest(request);
    const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const { subject, html } = templatePasswordReset({ resetLink });

    const sendResult = await sendEmail({ to: user.email, subject, html });
    if (!sendResult.ok) {
      logError("auth.forgot_password.send_failed", new Error(sendResult.error), { requestId, userId: user.id });
      return NextResponse.json(
        { error: "Не удалось отправить письмо. Попробуйте позже или обратитесь в поддержку." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "На указанный email отправлена ссылка для сброса пароля.",
    });
  } catch (error) {
    logError("auth.forgot_password.error", error, { requestId, ip });
    return internalError("Ошибка запроса");
  }
}
