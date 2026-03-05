/**
 * POST /api/admin/registration-requests/[id]/approve
 * Одобрить заявку: создать токен регистрации, привязать к заявке, вернуть ссылку.
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const { id } = await params;

  const req = await db.registrationRequest.findUnique({
    where: { id },
    select: { id: true, status: true, registrationTokenId: true },
  });

  if (!req) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  if (req.status === "APPROVED" && req.registrationTokenId) {
    const existing = await db.registrationToken.findUnique({
      where: { id: req.registrationTokenId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "По этой заявке уже выдан токен. Создайте новый токен в разделе Пользователи при необходимости." },
        { status: 400 },
      );
    }
  }

  const token = generateRegistrationToken();
  const tokenHash = hashRegistrationToken(token);
  const expiresAt = getRegistrationTokenExpiresAt();

  const created = await db.registrationToken.create({
    data: {
      tokenHash,
      createdById: auth.user.userId,
      expiresAt,
    },
    select: { id: true },
  });

  await db.registrationRequest.update({
    where: { id },
    data: { status: "APPROVED", registrationTokenId: created.id },
  });

  const baseUrl = getBaseUrlFromRequest(request.nextUrl.origin);
  const link = `${baseUrl}/register?token=${encodeURIComponent(token)}`;

  return NextResponse.json({
    token,
    link,
    expiresAt: expiresAt.toISOString(),
    message: "Одноразовая ссылка — действует только на одну регистрацию. Отправьте заявителю на указанную в заявке почту.",
  });
}
