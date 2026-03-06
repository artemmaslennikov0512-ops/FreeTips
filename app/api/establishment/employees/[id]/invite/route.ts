/**
 * POST /api/establishment/employees/[id]/invite — отправить приглашение по email со ссылкой на регистрацию.
 * Требует: ESTABLISHMENT_ADMIN. Body: { email: string }
 * Отправка через sendEmail (SMTP или Resend — см. lib/email/templates.ts для шаблона).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import {
  generateRegistrationToken,
  hashRegistrationToken,
  getRegistrationTokenExpiresAt,
} from "@/lib/auth/registration-token";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError } from "@/lib/api/helpers";
import { sendEmail } from "@/lib/email/send";
import { templateInviteEmployee } from "@/lib/email/templates";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email("Укажите корректный email").max(255),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const { id: employeeId } = await params;
  const employee = await db.employee.findFirst({
    where: { id: employeeId, establishmentId: auth.establishmentId },
    select: { id: true, name: true, userId: true },
  });
  if (!employee) {
    return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
  }
  if (employee.userId) {
    return NextResponse.json(
      { error: "Сотрудник уже зарегистрирован." },
      { status: 400 },
    );
  }

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsed.ok) return parsed.response;
  const parseResult = inviteSchema.safeParse(parsed.data);
  if (!parseResult.success) {
    const msg = parseResult.error.issues[0]?.message ?? "Укажите email";
    return jsonError(400, msg);
  }

  const token = generateRegistrationToken();
  const tokenHash = hashRegistrationToken(token);
  const expiresAt = getRegistrationTokenExpiresAt();
  const baseUrl = getBaseUrlFromRequest(request);
  const link = `${baseUrl}/register?token=${encodeURIComponent(token)}`;

  await db.$transaction([
    db.registrationToken.updateMany({
      where: { employeeId, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    }),
    db.registrationToken.create({
      data: {
        tokenHash,
        createdById: auth.user.userId,
        expiresAt,
        employeeId,
      },
    }),
  ]);

  const { subject, html } = templateInviteEmployee({
    link,
    employeeName: employee.name,
    expiresAt,
  });

  const sendResult = await sendEmail({
    to: parseResult.data.email,
    subject,
    html,
  });

  if (!sendResult.ok) {
    return NextResponse.json(
      { error: sendResult.error || "Отправка писем не настроена. Настройте SMTP или RESEND_API_KEY." },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { success: true, message: "Письмо с ссылкой отправлено" },
    { status: 201 },
  );
}
