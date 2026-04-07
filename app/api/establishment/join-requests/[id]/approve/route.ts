/**
 * POST /api/establishment/join-requests/[id]/approve — одобрить заявку, создать сотрудника и привязать User.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { RegistrationRequestStatus, UserRole } from "@prisma/client";
import {
  createEstablishmentEmployeeInTransaction,
  WaiterQrIdentifierExhaustedError,
} from "@/lib/establishment-create-employee-tx";
import { syncTipLinksForEstablishment } from "@/lib/tip-routing";
import { jsonError } from "@/lib/api/helpers";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  if (!verifyCsrfFromRequest(request)) {
    return NextResponse.json({ error: "Некорректный CSRF токен" }, { status: 403 });
  }

  const { id: requestId } = await params;

  try {
    await db.$transaction(async (tx) => {
      const joinReq = await tx.employeeJoinRequest.findFirst({
        where: {
          id: requestId,
          establishmentId: auth.establishmentId,
          status: RegistrationRequestStatus.PENDING,
        },
        include: {
          user: { select: { id: true, role: true, login: true, fullName: true } },
        },
      });

      if (!joinReq) {
        throw new Error("REQUEST_NOT_FOUND");
      }

      const u = joinReq.user;
      if (u.role !== UserRole.RECIPIENT) {
        throw new Error("USER_NOT_RECIPIENT");
      }

      const alreadyEmployee = await tx.employee.findUnique({
        where: { userId: u.id },
        select: { id: true },
      });
      if (alreadyEmployee) {
        throw new Error("USER_ALREADY_EMPLOYEE");
      }

      const establishment = await tx.establishment.findUnique({
        where: { id: auth.establishmentId },
        select: {
          maxEmployeesCount: true,
          _count: { select: { employees: true } },
        },
      });
      if (!establishment) {
        throw new Error("ESTABLISHMENT_NOT_FOUND");
      }
      const max = establishment.maxEmployeesCount;
      const current = establishment._count.employees;
      if (max != null && current >= max) {
        throw new Error("EMPLOYEE_LIMIT");
      }

      const displayName = u.fullName?.trim() || u.login;
      const created = await createEstablishmentEmployeeInTransaction(tx, auth.establishmentId, {
        name: displayName,
        position: "Официант",
      });

      await tx.employee.update({
        where: { id: created.id },
        data: { userId: u.id },
      });

      await tx.user.update({
        where: { id: u.id },
        data: {
          role: UserRole.EMPLOYEE,
          establishmentId: auth.establishmentId,
        },
      });

      await tx.employeeJoinRequest.update({
        where: { id: joinReq.id },
        data: {
          status: RegistrationRequestStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedByUserId: auth.user.userId,
        },
      });
    });
  } catch (e) {
    if (e instanceof WaiterQrIdentifierExhaustedError) {
      return jsonError(409, e.message);
    }
    if (e instanceof Error && e.message === "ESTABLISHMENT_NOT_FOUND") {
      return NextResponse.json({ error: "Заведение не найдено" }, { status: 404 });
    }
    if (e instanceof Error) {
      if (e.message === "REQUEST_NOT_FOUND") {
        return NextResponse.json({ error: "Заявка не найдена или уже обработана" }, { status: 404 });
      }
      if (e.message === "USER_NOT_RECIPIENT" || e.message === "USER_ALREADY_EMPLOYEE") {
        return NextResponse.json({ error: "Пользователь не может быть подключён по этой заявке" }, { status: 409 });
      }
      if (e.message === "EMPLOYEE_LIMIT") {
        return NextResponse.json({ error: "Достигнут лимит сотрудников" }, { status: 403 });
      }
    }
    throw e;
  }

  await syncTipLinksForEstablishment(auth.establishmentId);

  return NextResponse.json({
    success: true,
    message:
      "Сотрудник подключён. Попросите официанта выйти из аккаунта и войти снова, чтобы обновилась роль в системе.",
  });
}
