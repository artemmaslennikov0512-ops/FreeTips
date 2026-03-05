/**
 * POST /api/establishment/employees/[id]/invite — отправить приглашение по email со ссылкой на регистрацию.
 * Требует: ESTABLISHMENT_ADMIN. Body: { email: string }
 * Для отправки нужны RESEND_API_KEY и RESEND_FROM в .env
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
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email("Укажите корректный email").max(255),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "FreeTips <onboarding@resend.dev>";
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json(
      { error: "Отправка писем не настроена. Добавьте RESEND_API_KEY в настройки сервера." },
      { status: 503 },
    );
  }

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
  let origin = "https://example.com";
  try {
    const url = new URL(request.url);
    origin = url.origin;
  } catch {
    // ignore
  }
  const baseUrl = getBaseUrlFromRequest(origin);
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

  const subject = `Приглашение в FreeTips — регистрация как официант`;
  const html = `
    <p>Здравствуйте!</p>
    <p>Вам направлена ссылка для регистрации в сервисе чаевых FreeTips (как официант${employee.name ? ` — ${employee.name}` : ""}).</p>
    <p><a href="${link}">Перейти к регистрации</a></p>
    <p>Ссылка действительна до ${expiresAt.toLocaleString("ru-RU")}.</p>
    <p>Если вы не запрашивали приглашение, проигнорируйте это письмо.</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: parseResult.data.email,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: err?.message ?? "Не удалось отправить письмо" },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { success: true, message: "Письмо с ссылкой отправлено" },
    { status: 201 },
  );
}
