/**
 * GET /api/verification — статус верификации и текущая заявка.
 * POST /api/verification — создание заявки (этап 1: данные) или проверка готовности к отправке.
 * Только для авторизованного пользователя (Bearer). Ограничено ролью EMPLOYEE/RECIPIENT (не админ).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { verificationStep1Schema, verificationSubmitSchema } from "@/lib/validations";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError } from "@/lib/api/helpers";
import { logError } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { VerificationStatus } from "@prisma/client";

const ALLOWED_ROLES = ["EMPLOYEE", "RECIPIENT"];

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const userId = auth.user.userId;
  const role = auth.user.role;
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        verificationStatus: true,
        verificationRejectionReason: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    const pendingRequest = await db.verificationRequest.findFirst({
      where: { userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        birthDate: true,
        passportSeries: true,
        passportNumber: true,
        inn: true,
        documents: {
          select: { type: true },
        },
      },
    });

    const docs = pendingRequest?.documents ?? [];
    const hasPassportMain = docs.some((d) => d.type === "passport_main");
    const hasPassportSpread = docs.some((d) => d.type === "passport_spread");
    const hasSelfie = docs.some((d) => d.type === "selfie");

    return NextResponse.json({
      verificationStatus: user.verificationStatus,
      verificationRejectionReason: user.verificationRejectionReason ?? null,
      currentRequest: pendingRequest
        ? {
            id: pendingRequest.id,
            fullName: pendingRequest.fullName,
            birthDate: pendingRequest.birthDate,
            passportSeries: pendingRequest.passportSeries,
            passportNumber: pendingRequest.passportNumber,
            inn: pendingRequest.inn,
            hasPassportMain,
            hasPassportSpread,
            hasSelfie,
          }
        : null,
    });
  } catch (err) {
    logError("verification.get.error", err, { requestId: getRequestId(request) });
    return internalError("Не удалось загрузить данные верификации");
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const userId = auth.user.userId;
  const role = auth.user.role;
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const parsedBody = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsedBody.ok) return parsedBody.response;

  const submitParsed = verificationSubmitSchema.safeParse(parsedBody.data);
  if (submitParsed.success) {
    const req = await db.verificationRequest.findFirst({
      where: { userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { documents: { select: { type: true } } },
    });
    if (!req) {
      return jsonError(400, "Сначала заполните данные и загрузите документы (этап 1 и 2)");
    }
    const types = new Set(req.documents.map((d) => d.type));
    if (!types.has("passport_main") || !types.has("passport_spread") || !types.has("selfie")) {
      return jsonError(400, "Загрузите все документы: главное фото паспорта, разворот и селфи с паспортом");
    }
    await db.user.update({
      where: { id: userId },
      data: {
        verificationStatus: VerificationStatus.PENDING,
        verificationRejectionReason: null,
      },
    });
    return NextResponse.json({ ok: true, message: "Заявка отправлена на рассмотрение" });
  }

  const step1Parsed = verificationStep1Schema.safeParse(parsedBody.data);
  if (!step1Parsed.success) {
    return NextResponse.json(
      { error: "Неверные данные", issues: step1Parsed.error.issues },
      { status: 400 },
    );
  }
  const data = step1Parsed.data;

  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { verificationStatus: true },
  });
  if (existing?.verificationStatus === VerificationStatus.VERIFIED) {
    return jsonError(400, "Аккаунт уже верифицирован");
  }

  const existingPending = await db.verificationRequest.findFirst({
    where: { userId, status: "PENDING" },
    select: { id: true },
  });
  if (existingPending) {
    await db.verificationRequest.update({
      where: { id: existingPending.id },
      data: {
        fullName: data.fullName,
        birthDate: data.birthDate,
        passportSeries: data.passportSeries,
        passportNumber: data.passportNumber,
        inn: data.inn,
      },
    });
    return NextResponse.json({ requestId: existingPending.id });
  }

  const req = await db.verificationRequest.create({
    data: {
      userId,
      fullName: data.fullName,
      birthDate: data.birthDate,
      passportSeries: data.passportSeries,
      passportNumber: data.passportNumber,
      inn: data.inn,
      status: "PENDING",
    },
    select: { id: true },
  });
  // Не переводим пользователя в PENDING здесь — только после явной отправки заявки (POST с consent).
  return NextResponse.json({ requestId: req.id });
}
