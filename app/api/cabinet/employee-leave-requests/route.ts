/**
 * GET /api/cabinet/employee-leave-requests — мои заявки на выход из заведения.
 * POST — подать заявку (только EMPLOYEE с привязкой к заведению).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { RegistrationRequestStatus, UserRole } from "@prisma/client";

const statusLabel: Record<RegistrationRequestStatus, string> = {
  PENDING: "Ожидается подтверждение администратора",
  APPROVED: "Одобрено — вы отвязаны от заведения",
  REJECTED: "Отклонено",
};

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

  const list = await db.employeeLeaveRequest.findMany({
    where: { userId: auth.user.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      establishment: { select: { name: true, uniqueSlug: true } },
    },
  });

  return NextResponse.json({
    requests: list.map((r) => ({
      id: r.id,
      status: r.status,
      statusHint: statusLabel[r.status],
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt.toISOString(),
      establishmentName: r.establishment.name,
      establishmentCode: r.establishment.uniqueSlug,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

  if (!verifyCsrfFromRequest(request)) {
    return NextResponse.json({ error: "Некорректный CSRF токен" }, { status: 403 });
  }

  if (auth.user.role !== UserRole.EMPLOYEE) {
    return NextResponse.json({ error: "Заявку может отправить только официант, привязанный к заведению" }, { status: 403 });
  }

  const userRow = await db.user.findUnique({
    where: { id: auth.user.userId },
    select: { establishmentId: true },
  });
  if (!userRow?.establishmentId) {
    return NextResponse.json({ error: "Аккаунт не привязан к заведению" }, { status: 403 });
  }

  const employee = await db.employee.findFirst({
    where: { userId: auth.user.userId, establishmentId: userRow.establishmentId },
    select: { id: true },
  });
  if (!employee) {
    return NextResponse.json({ error: "Карточка сотрудника не найдена" }, { status: 404 });
  }

  const duplicate = await db.employeeLeaveRequest.findFirst({
    where: {
      userId: auth.user.userId,
      establishmentId: userRow.establishmentId,
      status: RegistrationRequestStatus.PENDING,
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Заявка на выход уже отправлена" }, { status: 409 });
  }

  const row = await db.employeeLeaveRequest.create({
    data: {
      establishmentId: userRow.establishmentId,
      userId: auth.user.userId,
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json(
    {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      statusHint: statusLabel.PENDING,
    },
    { status: 201 },
  );
}
