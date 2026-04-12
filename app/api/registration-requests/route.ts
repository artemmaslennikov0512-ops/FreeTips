/**
 * POST /api/registration-requests — подать заявку на подключение (публично).
 * Регистрация в сервисе возможна только по ссылке с токеном; эта заявка попадает в дашборд суперадмина.
 */

import { NextRequest, NextResponse } from "next/server";
import { RegistrationRequestStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { createRegistrationRequestSchema } from "@/lib/validations";
import {
  checkRateLimitByIP,
  getRateLimitIpKey,
  REGISTRATION_REQUEST_RATE_LIMIT,
} from "@/lib/middleware/rate-limit";
import { parseJsonWithLimit, MAX_BODY_SIZE_DEFAULT, jsonError, rateLimit429Response } from "@/lib/api/helpers";

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimitByIP(getRateLimitIpKey(request), REGISTRATION_REQUEST_RATE_LIMIT);
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
  const emailNormalized = data.email;

  const existingUser = await db.user.findFirst({
    where: {
      email: { equals: emailNormalized, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (existingUser) {
    return jsonError(
      409,
      "Этот email уже зарегистрирован. Войдите в аккаунт с этой почтой или укажите другой адрес.",
      [{ path: ["email"], message: "Этот email уже используется в сервисе" }],
    );
  }

  const openRequestSameEmail = await db.registrationRequest.findFirst({
    where: {
      email: { equals: emailNormalized, mode: "insensitive" },
      status: { not: RegistrationRequestStatus.REJECTED },
    },
    select: { id: true },
  });
  if (openRequestSameEmail) {
    return jsonError(
      409,
      "По этому email уже есть активная заявка на подключение. Дождитесь рассмотрения или укажите другой адрес.",
      [{ path: ["email"], message: "Этот email уже указан в другой заявке" }],
    );
  }

  const req = await db.registrationRequest.create({
    data: {
      requestType: "individual",
      fullName: "—",
      dateOfBirth: "—",
      phone: data.phone,
      activityType: "—",
      establishment: "",
      email: emailNormalized,
      companyName: null,
      companyRole: null,
      employeeCount: null,
      adminFullName: null,
      adminContactPhone: null,
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json(
    { id: req.id, message: "Заявка принята. Ссылка для регистрации будет отправлена на указанную почту после одобрения." },
    { status: 201 },
  );
}
