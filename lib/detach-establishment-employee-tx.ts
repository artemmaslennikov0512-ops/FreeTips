/**
 * Отвязка аккаунта User от карточки Employee: роль RECIPIENT, сброс establishmentId у пользователя.
 */

import type { Prisma } from "@prisma/client";
import { UserRole } from "@prisma/client";

export async function detachEmployeeUserInTransaction(
  tx: Prisma.TransactionClient,
  params: { employeeId: string; establishmentId: string; userId: string },
): Promise<void> {
  const emp = await tx.employee.findFirst({
    where: {
      id: params.employeeId,
      establishmentId: params.establishmentId,
      userId: params.userId,
    },
    select: { id: true },
  });
  if (!emp) {
    throw new Error("EMPLOYEE_NOT_LINKED");
  }

  const user = await tx.user.findUnique({
    where: { id: params.userId },
    select: { id: true, role: true, establishmentId: true },
  });
  if (!user || user.role !== UserRole.EMPLOYEE) {
    throw new Error("USER_NOT_EMPLOYEE");
  }
  if (user.establishmentId !== params.establishmentId) {
    throw new Error("ESTABLISHMENT_MISMATCH");
  }

  await tx.employee.update({
    where: { id: emp.id },
    data: { userId: null },
  });

  await tx.user.update({
    where: { id: params.userId },
    data: {
      role: UserRole.RECIPIENT,
      establishmentId: null,
    },
  });
}
