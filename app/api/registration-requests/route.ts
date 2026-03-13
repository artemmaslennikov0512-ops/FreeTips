/**
 * POST /api/registration-requests — подать заявку на подключение (публично).
 * Регистрация в сервисе возможна только по ссылке с токеном; эта заявка попадает в дашборд суперадмина.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createRegistrationRequestSchema } from "@/lib/validations";
import { checkRateLimitByIP, getClientIP, REGISTRATION_REQUEST_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { parseJsonWithLimit, MAX_BODY_SIZE_DEFAULT, jsonError, rateLimit429Response } from "@/lib/api/helpers";

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rateLimit = await checkRateLimitByIP(ip, REGISTRATION_REQUEST_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return rateLimit429Response(rateLimit, "Слишком много заявок. Попробуйте позже.");
  }

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_DEFAULT);
  if (!parsed.ok) return parsed.response;

  const validated = createRegistrationRequestSchema.safeParse(parsed.data);
  if (!validated.success) {
    return jsonError(400, "Неверные данные", validated.error.issues);
  }

  const data = validated.data;
  const isEstablishment = data.requestType === "establishment";

  const req = await db.registrationRequest.create({
    data: {
      requestType: data.requestType,
      fullName: data.fullName,
      dateOfBirth: isEstablishment ? "" : data.dateOfBirth,
      phone: data.phone,
      activityType: isEstablishment ? "" : data.activityType,
      establishment: isEstablishment ? "" : (data.establishment ?? ""),
      email: data.email,
      companyName: isEstablishment ? data.companyName : null,
      companyRole: isEstablishment ? data.companyRole : null,
      employeeCount: isEstablishment ? data.employeeCount : null,
      adminFullName: !isEstablishment ? data.adminFullName : null,
      adminContactPhone: !isEstablishment ? data.adminContactPhone : null,
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json(
    { id: req.id, message: "Заявка принята. Ссылка для регистрации будет отправлена на указанную почту после одобрения." },
    { status: 201 },
  );
}
