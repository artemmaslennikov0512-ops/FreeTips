/**
 * POST /api/establishment/employees/[id]/disconnect — отвязать аккаунт от карточки сотрудника без заявки (решение администратора).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { RegistrationRequestStatus } from "@prisma/client";
import { detachEmployeeUserInTransaction } from "@/lib/detach-establishment-employee-tx";
import { syncTipLinksForEstablishment } from "@/lib/tip-routing";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  if (!verifyCsrfFromRequest(request)) {
    return NextResponse.json({ error: "Некорректный CSRF токен" }, { status: 403 });
  }

  const { id: employeeId } = await params;

  const employee = await db.employee.findFirst({
    where: { id: employeeId, establishmentId: auth.establishmentId },
    select: { id: true, userId: true },
  });

  if (!employee?.userId) {
    return NextResponse.json({ error: "У сотрудника нет привязанного аккаунта" }, { status: 400 });
  }

  const userId = employee.userId;

  try {
    await db.$transaction(async (tx) => {
      await tx.employeeLeaveRequest.updateMany({
        where: {
          userId,
          establishmentId: auth.establishmentId,
          status: RegistrationRequestStatus.PENDING,
        },
        data: {
          status: RegistrationRequestStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedByUserId: auth.user.userId,
          rejectionReason: "Закрыто: аккаунт отвязан администратором",
        },
      });

      await detachEmployeeUserInTransaction(tx, {
        employeeId: employee.id,
        establishmentId: auth.establishmentId,
        userId,
      });
    });
  } catch (e) {
    if (e instanceof Error) {
      if (
        e.message === "USER_NOT_EMPLOYEE" ||
        e.message === "EMPLOYEE_NOT_LINKED" ||
        e.message === "ESTABLISHMENT_MISMATCH"
      ) {
        return NextResponse.json({ error: "Не удалось отвязать аккаунт" }, { status: 409 });
      }
    }
    throw e;
  }

  await syncTipLinksForEstablishment(auth.establishmentId);

  return NextResponse.json({
    success: true,
    message:
      "Аккаунт отвязан от карточки сотрудника. Официанту нужно выйти из аккаунта и войти снова, чтобы обновилась роль.",
  });
}
