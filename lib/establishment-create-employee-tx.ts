/**
 * Создание сотрудника заведения + TipLink внутри транзакции (пул, код, ссылка).
 * Используется POST /api/establishment/employees и одобрение заявки на подключение.
 */

import type { Prisma } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { hashPassword } from "@/lib/auth/password";
import { getWaiterPaygineSdRef } from "@/lib/payment/paygine-sd-ref";
import { allocateWaiterQrIdentifier, WaiterQrIdentifierExhaustedError } from "@/lib/waiter-qr-identifier";

export type CreatedEstablishmentEmployee = {
  id: string;
  name: string;
  position: string | null;
  qrCodeIdentifier: string;
};

/**
 * Гарантирует tipPoolUserId у заведения и возвращает id пользователя-пула.
 */
export async function ensureEstablishmentPoolUserId(
  tx: Prisma.TransactionClient,
  establishmentId: string,
  currentPoolUserId: string | null | undefined,
): Promise<string | null> {
  let poolUserId = currentPoolUserId?.trim() || null;
  if (poolUserId) return poolUserId;

  const est = await tx.establishment.findUnique({
    where: { id: establishmentId },
    select: { id: true },
  });
  if (!est) return null;

  const poolLogin = `pool-${est.id}`;
  const existingPool = await tx.user.findUnique({
    where: { login: poolLogin },
    select: { id: true },
  });
  if (existingPool) {
    poolUserId = existingPool.id;
    await tx.establishment.update({
      where: { id: establishmentId },
      data: { tipPoolUserId: existingPool.id },
    });
    return poolUserId;
  }

  const poolUser = await tx.user.create({
    data: {
      login: poolLogin,
      passwordHash: await hashPassword(randomBytes(32).toString("hex")),
      role: UserRole.RECIPIENT,
    },
  });
  poolUserId = poolUser.id;
  await tx.establishment.update({
    where: { id: establishmentId },
    data: { tipPoolUserId: poolUser.id },
  });
  return poolUserId;
}

export async function createEstablishmentEmployeeInTransaction(
  tx: Prisma.TransactionClient,
  establishmentId: string,
  input: { name: string; position: string | null },
): Promise<CreatedEstablishmentEmployee> {
  const est = await tx.establishment.findUnique({
    where: { id: establishmentId },
    select: { tipPoolUserId: true },
  });
  if (!est) {
    throw new Error("ESTABLISHMENT_NOT_FOUND");
  }

  let poolUserId = await ensureEstablishmentPoolUserId(tx, establishmentId, est.tipPoolUserId);

  const qrCodeIdentifier = await allocateWaiterQrIdentifier(tx);

  const emp = await tx.employee.create({
    data: {
      establishmentId,
      name: input.name.trim(),
      position: input.position?.trim() || null,
      qrCodeIdentifier,
    },
  });

  if (poolUserId) {
    await tx.user.updateMany({
      where: { id: poolUserId, paygineSdRef: null },
      data: { paygineSdRef: getWaiterPaygineSdRef(poolUserId) },
    });
    await tx.tipLink.create({
      data: {
        userId: poolUserId,
        slug: qrCodeIdentifier,
        employeeId: emp.id,
      },
    });
  }

  return {
    id: emp.id,
    name: emp.name,
    position: emp.position,
    qrCodeIdentifier: emp.qrCodeIdentifier,
  };
}

export { WaiterQrIdentifierExhaustedError };
