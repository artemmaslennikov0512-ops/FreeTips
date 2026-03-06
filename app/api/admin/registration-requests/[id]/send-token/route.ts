/**
 * POST /api/admin/registration-requests/[id]/send-token
 * Выслать ссылку регистрации на email из заявки. Создаёт новый токен и отправляет письмо.
 * Требует: SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import {
  generateRegistrationToken,
  hashRegistrationToken,
  getRegistrationTokenExpiresAt,
} from "@/lib/auth/registration-token";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";
import { sendEmail } from "@/lib/email/send";
import { templateRegistrationLinkFromRequest } from "@/lib/email/templates";
import { logError } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const requestId = getRequestId(request);
  const { id } = await params;

  const req = await db.registrationRequest.findUnique({
    where: { id },
    select: { id: true, status: true, email: true, fullName: true, registrationTokenId: true },
  });

  if (!req) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  if (req.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Сначала примите заявку (Принять подключение)" },
      { status: 400 },
    );
  }

  const token = generateRegistrationToken();
  const tokenHash = hashRegistrationToken(token);
  const expiresAt = getRegistrationTokenExpiresAt();

  await db.$transaction(async (tx) => {
    if (req.registrationTokenId) {
      await tx.registrationToken.updateMany({
        where: { id: req.registrationTokenId },
        data: { usedAt: new Date() },
      });
    }
    const created = await tx.registrationToken.create({
      data: {
        tokenHash,
        createdById: auth.user.userId,
        expiresAt,
      },
      select: { id: true },
    });
    await tx.registrationRequest.update({
      where: { id },
      data: { registrationTokenId: created.id },
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
  const link = `${baseUrl}/register?token=${encodeURIComponent(token)}`;
  const { subject, html } = templateRegistrationLinkFromRequest({
    link,
    fullName: req.fullName,
    expiresAt,
  });

  const sendResult = await sendEmail({ to: req.email, subject, html });
  if (!sendResult.ok) {
    logError("admin.registration_request.send_token.failed", new Error(sendResult.error), { requestId, registrationRequestId: id });
    return NextResponse.json(
      { error: "Не удалось отправить письмо. Проверьте настройки почты на сервере." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    link,
    expiresAt: expiresAt.toISOString(),
    message: `Ссылка отправлена на ${req.email}`,
  });
}
