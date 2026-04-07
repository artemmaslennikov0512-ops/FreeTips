/**
 * POST /api/establishment/leave-requests/[id]/approve — одобрить выход: отвязать аккаунт от карточки сотрудника.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { RegistrationRequestStatus, UserRole } from "@prisma/client";
import { detachEmployeeUserInTransaction } from "@/lib/detach-establishment-employee-tx";
import { syncTipLinksForEstablishment } from "@/lib/tip-routing";

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
      const leaveReq = await tx.employeeLeaveRequest.findFirst({
        where: {
          id: requestId,
          establishmentId: auth.establishmentId,
          status: RegistrationRequestStatus.PENDING,
        },
        include: {
          user: { select: { id: true, role: true } },
        },
      });

      if (!leaveReq) {
        throw new Error("REQUEST_NOT_FOUND");
      }

      if (leaveReq.user.role !== UserRole.EMPLOYEE) {
        throw new Error("USER_NOT_EMPLOYEE");
      }

      const employee = await tx.employee.findFirst({
        where: { userId: leaveReq.userId, establishmentId: auth.establishmentId },
        select: { id: true },
      });
      if (!employee) {
        throw new Error("EMPLOYEE_NOT_LINKED");
      }

      await detachEmployeeUserInTransaction(tx, {
        employeeId: employee.id,
        establishmentId: auth.establishmentId,
        userId: leaveReq.userId,
      });

      await tx.employeeLeaveRequest.update({
        where: { id: leaveReq.id },
        data: {
          status: RegistrationRequestStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedByUserId: auth.user.userId,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "REQUEST_NOT_FOUND") {
        return NextResponse.json({ error: "Заявка не найдена или уже обработана" }, { status: 404 });
      }
      if (
        e.message === "USER_NOT_EMPLOYEE" ||
        e.message === "EMPLOYEE_NOT_LINKED" ||
        e.message === "ESTABLISHMENT_MISMATCH"
      ) {
        return NextResponse.json({ error: "Нельзя выполнить отвязку по этой заявке" }, { status: 409 });
      }
    }
    throw e;
  }

  await syncTipLinksForEstablishment(auth.establishmentId);

  return NextResponse.json({
    success: true,
    message:
      "Официант отвязан от заведения. Попросите его выйти из аккаунта и войти снова, чтобы обновилась роль в системе.",
  });
}
