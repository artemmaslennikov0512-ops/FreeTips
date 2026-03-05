/**
 * POST /api/establishment/employees/[id]/registration-token
 * Выдать или перегенерировать токен для регистрации официанта (1 токен = 1 сотрудник).
 * Если у сотрудника уже есть неиспользованный токен — старый помечается использованным, создаётся новый.
 * Требует: ESTABLISHMENT_ADMIN, сотрудник должен принадлежать заведению
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const { id: employeeId } = await params;
  const employee = await db.employee.findFirst({
    where: { id: employeeId, establishmentId: auth.establishmentId },
  });
  if (!employee) {
    return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
  }

  if (employee.userId) {
    return NextResponse.json(
      { error: "Сотрудник уже привязан к аккаунту. Токен не нужен." },
      { status: 400 },
    );
  }

  const token = generateRegistrationToken();
  const tokenHash = hashRegistrationToken(token);
  const expiresAt = getRegistrationTokenExpiresAt();
  const baseUrl = getBaseUrlFromRequest(request.nextUrl.origin);

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

  const link = `${baseUrl}/register?token=${encodeURIComponent(token)}`;

  return NextResponse.json(
    {
      registrationLink: link,
      expiresAt: expiresAt.toISOString(),
    },
    { status: 201 },
  );
}
