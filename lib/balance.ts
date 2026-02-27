/**
 * Расчёт баланса пользователя: успешные чаевые минус выполненные выводы.
 */

import { db } from "@/lib/db";

export async function getBalance(userId: string): Promise<{
  balanceKop: bigint;
  receivedKop: bigint;
  withdrawnKop: bigint;
}> {
  const [txSum, payoutSum] = await Promise.all([
    db.transaction.aggregate({
      where: { recipientId: userId, status: "SUCCESS" },
      _sum: { amountKop: true, feeKop: true },
    }),
    db.payoutRequest.aggregate({
      where: { userId, status: "COMPLETED" },
      _sum: { amountKop: true, feeKop: true },
    }),
  ]);
  const amountReceived = txSum._sum.amountKop ?? BigInt(0);
  const feeDeduct = txSum._sum.feeKop ?? BigInt(0);
  const received = amountReceived - feeDeduct;
  const withdrawnAmount = payoutSum._sum.amountKop ?? BigInt(0);
  const withdrawnFee = payoutSum._sum.feeKop ?? BigInt(0);
  const withdrawn = withdrawnAmount + withdrawnFee;
  return { balanceKop: received - withdrawn, receivedKop: received, withdrawnKop: withdrawn };
}
