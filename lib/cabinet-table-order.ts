import { EstablishmentTableOrderStatus } from "@prisma/client";
import { db } from "@/lib/db";

export async function recalcTableOrderTotalKop(orderId: string): Promise<bigint> {
  const lines = await db.establishmentTableOrderLine.findMany({
    where: { orderId },
    select: { priceKopSnapshot: true, quantity: true },
  });
  let total = BigInt(0);
  for (const l of lines) {
    total += l.priceKopSnapshot * BigInt(Math.max(0, l.quantity));
  }
  await db.establishmentTableOrder.update({
    where: { id: orderId },
    data: { totalKop: total },
  });
  return total;
}

export function assertOrderEditable(status: EstablishmentTableOrderStatus): void {
  if (status !== EstablishmentTableOrderStatus.OPEN) {
    throw new Error("ORDER_NOT_EDITABLE");
  }
}
