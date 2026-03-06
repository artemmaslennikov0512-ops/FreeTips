/**
 * POST /api/auth/forgot-password
 * Запрос сброса пароля: проверяются логин, email и ФИО (как при регистрации).
 * Создаёт токен и отправляет письмо только при совпадении всех данных.
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
import { templatePasswordReset } from "@/lib/email/templates";

function normalizeFullName(s: string | null | undefined): string {
  if (!s || typeof s !== "string") return "";
  return s.trim().toLowerCase().replace(/\s+/g, " ");
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
      return jsonError(400, "Заполните все поля", validated.error.issues, { hideDetailsInProduction: true });
    }

    const { login, email, fullName } = validated.data;
    const user = await db.user.findFirst({
      where: { login: { equals: login, mode: "insensitive" } },
      select: { id: true, email: true, fullName: true },
    });

    const emailMatch = user?.email && user.email.toLowerCase() === email.trim().toLowerCase();
    const storedFullName = normalizeFullName(user?.fullName);
    const fullNameMatch = storedFullName === "" || storedFullName === normalizeFullName(fullName);

    if (user?.email && emailMatch && fullNameMatch) {
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

      let origin = "https://example.com";
      try {
        const url = new URL(request.url);
        origin = url.origin;
      } catch {
        // ignore
      }
      const baseUrl = getBaseUrlFromRequest(origin);
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
      const { subject, html } = templatePasswordReset({ resetLink });

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
