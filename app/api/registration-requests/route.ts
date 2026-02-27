/**
 * POST /api/registration-requests — подать заявку на подключение (публично).
 * Регистрация в сервисе возможна только по ссылке с токеном; эта заявка попадает в дашборд суперадмина.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createRegistrationRequestSchema } from "@/lib/validations";
import { checkRateLimitByIP, getClientIP, REGISTRATION_REQUEST_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { parseJsonWithLimit, MAX_BODY_SIZE_DEFAULT, jsonError } from "@/lib/api/helpers";

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rateLimit = checkRateLimitByIP(ip, REGISTRATION_REQUEST_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Слишком много заявок. Попробуйте позже." },
      { status: 429 },
    );
  }

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_DEFAULT);
  if (!parsed.ok) return parsed.response;

  const validated = createRegistrationRequestSchema.safeParse(parsed.data);
  if (!validated.success) {
    return jsonError(400, "Неверные данные", validated.error.issues);
  }

  const data = validated.data;

  const req = await db.registrationRequest.create({
    data: {
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      phone: data.phone,
      activityType: data.activityType,
      establishment: data.establishment ?? "",
      email: data.email,
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json(
    { id: req.id, message: "Заявка принята. Ссылка для регистрации будет отправлена на указанную почту после одобрения." },
    { status: 201 },
  );
}
