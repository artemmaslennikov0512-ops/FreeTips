/**
 * POST /api/admin/establishments/[id]/registration-token
 * Создать новый токен для регистрации управляющего заведения (или перегенерировать).
 * Старый неиспользованный токен для этого заведения помечается использованным.
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

  const { id: establishmentId } = await params;
  const establishment = await db.establishment.findUnique({
    where: { id: establishmentId },
  });
  if (!establishment) {
    return NextResponse.json({ error: "Заведение не найдено" }, { status: 404 });
  }

  const token = generateRegistrationToken();
  const tokenHash = hashRegistrationToken(token);
  const expiresAt = getRegistrationTokenExpiresAt();
  const baseUrl = getBaseUrlFromRequest(request.nextUrl.origin);

  await db.$transaction([
    // Пометить старые неиспользованные токены для этого заведения как использованные (истёкшие по факту)
    db.registrationToken.updateMany({
      where: {
        establishmentId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    }),
    db.registrationToken.create({
      data: {
        tokenHash,
        createdById: auth.user.userId,
        expiresAt,
        establishmentId,
      },
    }),
  ]);

  const link = `${baseUrl}/register?token=${encodeURIComponent(token)}`;

  return NextResponse.json(
    {
      registrationLink: link,
      expiresAt: expiresAt.toISOString(),
    },
    { status: 201 },
  );
}
