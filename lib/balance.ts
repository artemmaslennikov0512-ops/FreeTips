/**
 * Расчёт баланса пользователя: успешные чаевые минус выполненные выводы.
 */

import { db } from "@/lib/db";

export async function getBalance(userId: string): Promise<{
  balanceKop: bigint;
  receivedKop: bigint;
  withdrawnKop: bigint;
}> {
  const [txRows, poolShareSum, payoutSum] = await Promise.all([
    db.transaction.findMany({
      where: { recipientId: userId, status: "SUCCESS" },
      select: { amountKop: true, feeKop: true, establishmentShareKop: true },
    }),
    db.transaction.aggregate({
      where: { poolShareRecipientId: userId, status: "SUCCESS" },
      _sum: { establishmentShareKop: true },
    }),
    db.payoutRequest.aggregate({
      where: { userId, status: "COMPLETED" },
      _sum: { amountKop: true, feeKop: true },
    }),
  ]);
  let received = BigInt(0);
  for (const t of txRows) {
    const fee = t.feeKop ?? BigInt(0);
    const share = t.establishmentShareKop ?? BigInt(0);
    received += t.amountKop - fee - share;
  }
  received += poolShareSum._sum.establishmentShareKop ?? BigInt(0);
  const withdrawnAmount = payoutSum._sum.amountKop ?? BigInt(0);
  const withdrawnFee = payoutSum._sum.feeKop ?? BigInt(0);
  const withdrawn = withdrawnAmount + withdrawnFee;
  return { balanceKop: received - withdrawn, receivedKop: received, withdrawnKop: withdrawn };
}
