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
import { classifySendEmailFailure } from "@/lib/email/classify-send-failure";
import { sendEmail } from "@/lib/email/send";
import { templateRegistrationLinkFromRequest } from "@/lib/email/templates";
import { emailSchema } from "@/lib/validations";
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

  const toParsed = emailSchema.safeParse(req.email?.trim() ?? "");
  if (!toParsed.success) {
    return NextResponse.json(
      { error: "В заявке указан некорректный email. Исправьте заявку или выдайте ссылку вручную." },
      { status: 400 },
    );
  }
  const toEmail = toParsed.data;

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

  const baseUrl = getBaseUrlFromRequest(request);
  const link = `${baseUrl}/register?token=${encodeURIComponent(token)}`;
  const { subject, html } = templateRegistrationLinkFromRequest({
    link,
    fullName: req.fullName,
    expiresAt,
  });

  const greeting = req.fullName?.trim()
    ? `Здравствуйте, ${req.fullName.trim()}!`
    : "Здравствуйте!";
  const textPlain = [
    greeting,
    "",
    "Ваша заявка на подключение к сервису чаевых FreeTips одобрена. Ссылка для регистрации (одноразовая):",
    link,
    "",
    `Срок действия ссылки — до ${expiresAt.toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" })}.`,
    "",
    "Если вы не оставляли заявку, проигнорируйте это письмо.",
  ].join("\n");

  const sendResult = await sendEmail({ to: toEmail, subject, html, text: textPlain });
  if (!sendResult.ok) {
    logError("admin.registration_request.send_token.failed", new Error(sendResult.error), {
      requestId,
      registrationRequestId: id,
      toDomain: toEmail.split("@")[1] ?? "",
    });
    const { summary, detail } = classifySendEmailFailure(sendResult.error);
    return NextResponse.json({ error: summary, detail }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    link,
    expiresAt: expiresAt.toISOString(),
    message: `Ссылка отправлена на ${toEmail}`,
  });
}
