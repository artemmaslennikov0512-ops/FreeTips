/**
 * POST /api/auth/verify-email-code
 * Проверка 6-значного кода. При успехе помечает email как подтверждённый (для регистрации).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitByIP, getClientIP, AUTH_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError } from "@/lib/api/helpers";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { checkAndConsumeEmailCode } from "@/lib/email-verification-store";

const schema = z.object({
  email: z.string().trim().min(1, "Укажите email").email("Неверный формат email").transform((s) => s.toLowerCase()),
  code: z
    .string()
    .trim()
    .length(6, "Код должен содержать 6 цифр")
    .regex(/^\d{6}$/, "Проверьте правильность введённого кода"),
});

export async function POST(request: NextRequest) {
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
    const result = schema.safeParse(parsed.data);
    if (!result.success) {
      const first = result.error.issues[0];
      const message = first?.path.includes("code") ? first.message : "Неверные данные";
      return jsonError(400, message, result.error.issues, { hideDetailsInProduction: true });
    }

    const { email, code } = result.data;
    const ok = checkAndConsumeEmailCode(email, code);
    if (!ok) {
      return NextResponse.json(
        { error: "Неверный или просроченный код. Запросите новый код." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, message: "Почта подтверждена" });
  } catch {
    return internalError("Ошибка проверки");
  }
}
