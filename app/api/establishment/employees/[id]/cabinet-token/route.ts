/**
 * POST /api/establishment/employees/[id]/cabinet-token
 * Выдаёт access JWT от имени сотрудника (EMPLOYEE) для просмотра ЛК управляющим заведения.
 * Требует: ESTABLISHMENT_ADMIN; сотрудник и привязанный пользователь — того же заведения.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { generateImpersonationAccessToken } from "@/lib/auth/jwt";
import { logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { getClientIP } from "@/lib/middleware/rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const requestId = getRequestId(request);
  const ip = getClientIP(request);
  const { id: employeeId } = await params;

  const employee = await db.employee.findFirst({
    where: { id: employeeId, establishmentId: auth.establishmentId },
    select: { userId: true },
  });

  if (!employee?.userId) {
    return NextResponse.json(
      { error: "Сотрудник не привязан к аккаунту — личный кабинет недоступен" },
      { status: 400 },
    );
  }

  const target = await db.user.findUnique({
    where: { id: employee.userId },
    select: { id: true, login: true, role: true, isBlocked: true, establishmentId: true },
  });

  if (!target || target.role === UserRole.SUPERADMIN || target.role === UserRole.ADMIN) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  if (target.role !== UserRole.EMPLOYEE) {
    return NextResponse.json(
      { error: "Просмотр доступен только для аккаунта официанта" },
      { status: 400 },
    );
  }

  if (target.establishmentId !== auth.establishmentId) {
    return NextResponse.json({ error: "Сотрудник не принадлежит этому заведению" }, { status: 403 });
  }

  if (target.isBlocked) {
    return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
  }

  const accessToken = await generateImpersonationAccessToken(
    { userId: target.id, login: target.login, role: target.role },
    auth.user.userId,
  );

  logSecurity("establishment.cabinet_impersonation.token_issued", {
    requestId,
    ip,
    impersonatorUserId: auth.user.userId,
    establishmentId: auth.establishmentId,
    targetUserId: target.id,
    employeeId,
  });

  return NextResponse.json({
    accessToken,
    login: target.login,
    role: target.role,
  });
}
