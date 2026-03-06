/**
 * POST /api/auth/forgot-password
 * Запрос сброса пароля по логину или email.
 * Создаёт токен и отправляет письмо со ссылкой (Resend или SMTP: Mail.ru, Яндекс и др.).
 * Всегда возвращает успех (не раскрываем наличие аккаунта).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forgotPasswordRequestSchema } from "@/lib/validations";
import { checkRateLimitByIP, getClientIP, AUTH_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError } from "@/lib/api/helpers";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  getPasswordResetTokenExpiresAt,
} from "@/lib/auth/password-reset-token";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";
import { sendEmail } from "@/lib/email/send";

function looksLikeEmail(s: string): boolean {
  return s.includes("@") && s.length >= 5;
}

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
    const validated = forgotPasswordRequestSchema.safeParse(parsed.data);
    if (!validated.success) {
      return jsonError(400, "Укажите логин или email", validated.error.issues);
    }

    const value = validated.data.loginOrEmail.trim();
    const isEmail = looksLikeEmail(value);

    const user = await db.user.findFirst({
      where: isEmail
        ? { email: { equals: value, mode: "insensitive" } }
        : { login: { equals: value, mode: "insensitive" } },
      select: { id: true, email: true },
    });

    if (user?.email) {
      logSecurity("auth.forgot_password.request", { requestId, ip, userId: user.id });

      const token = generatePasswordResetToken();
      const tokenHash = hashPasswordResetToken(token);
      const expiresAt = getPasswordResetTokenExpiresAt();

      await db.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      let origin = "https://example.com";
      try {
        const url = new URL(request.url);
        origin = url.origin;
      } catch {
        // ignore
      }
      const baseUrl = getBaseUrlFromRequest(origin);
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

      const subject = "Сброс пароля — FreeTips";
      const html = `
        <p>Здравствуйте!</p>
        <p>Вы запросили сброс пароля в сервисе FreeTips.</p>
        <p><a href="${resetLink}">Перейти к сбросу пароля</a></p>
        <p>Ссылка действительна 1 час. Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
      `;

      const sendResult = await sendEmail({ to: user.email, subject, html });
      if (!sendResult.ok) {
        logError("auth.forgot_password.send_failed", new Error(sendResult.error), { requestId, userId: user.id });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Если аккаунт с указанными данными найден, на email придёт ссылка для сброса пароля.",
    });
  } catch (error) {
    logError("auth.forgot_password.error", error, { requestId, ip });
    return internalError("Ошибка запроса");
  }
}
