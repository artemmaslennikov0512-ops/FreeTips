/**
 * POST /api/auth/send-email-verification
 * Отправка 6-значного кода на email для подтверждения при регистрации.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitByIP, getClientIP, AUTH_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError, rateLimit429Response } from "@/lib/api/helpers";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { setEmailVerificationCode } from "@/lib/email-verification-store";
import { sendEmail } from "@/lib/email/send";
import { templateEmailVerificationCode } from "@/lib/email/templates";
import { logError } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";

const schema = z.object({
  email: z.string().trim().min(1, "Укажите email").email("Неверный формат email").transform((s) => s.toLowerCase()),
});

function generateSixDigitCode(): string {
  const n = Math.floor(Math.random() * 1_000_000);
  return n.toString().padStart(6, "0");
}

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
    const result = schema.safeParse(parsed.data);
    if (!result.success) {
      return jsonError(400, "Укажите корректный email", result.error.issues, { hideDetailsInProduction: true });
    }

    const email = result.data.email;
    const code = generateSixDigitCode();
    setEmailVerificationCode(email, code);

    const { subject, html } = templateEmailVerificationCode({ code });
    const sendResult = await sendEmail({ to: email, subject, html });
    if (!sendResult.ok) {
      logError("auth.send_email_verification.failed", new Error(sendResult.error), { requestId, email });
      return NextResponse.json(
        { error: "Не удалось отправить письмо. Проверьте настройки почты на сервере или попробуйте позже." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, message: "Код отправлен на указанный email" });
  } catch (err) {
    logError("auth.send_email_verification.error", err, { requestId, ip });
    return internalError("Ошибка отправки");
  }
}
