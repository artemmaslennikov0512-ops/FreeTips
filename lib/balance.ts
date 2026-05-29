/**
 * Расчёт баланса пользователя: успешные чаевые минус выполненные выводы.
 */

import { db } from "@/lib/db";
import { guestChargedKopForIncomingCardOrder, recipientFeeKopForIncomingTx } from "@/lib/payment/paygine-fee";

export async function getBalance(userId: string): Promise<{
  balanceKop: bigint;
  receivedKop: bigint;
  withdrawnKop: bigint;
  /** Сумма по SUCCESS, где пользователь — recipientId: списание с гостя (amount + acquiring fee), без доли пула с чужих ссылок. */
  guestPaidTipsKop: bigint;
}> {
  const [txRows, poolShareSum, payoutSum] = await Promise.all([
    db.transaction.findMany({
      where: { recipientId: userId, status: "SUCCESS" },
      select: { amountKop: true, feeKop: true, establishmentShareKop: true, paymentMethod: true, payerInfo: true },
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
  let guestPaidTips = BigInt(0);
  for (const t of txRows) {
    const fee = recipientFeeKopForIncomingTx({
      amountKop: t.amountKop,
      feeKop: t.feeKop,
      paymentMethod: t.paymentMethod === "sbp" ? "sbp" : "card",
      payerInfo: t.payerInfo,
      assumeLegacyCardRecipientFee: true,
    });
    const share = t.establishmentShareKop ?? BigInt(0);
    received += t.amountKop - fee - share;
    guestPaidTips += guestChargedKopForIncomingCardOrder(
      t.amountKop,
      t.feeKop,
      t.paymentMethod === "sbp" ? "sbp" : null,
      t.payerInfo,
    );
  }
  received += poolShareSum._sum.establishmentShareKop ?? BigInt(0);
  const withdrawnAmount = payoutSum._sum.amountKop ?? BigInt(0);
  const withdrawnFee = payoutSum._sum.feeKop ?? BigInt(0);
  const withdrawn = withdrawnAmount + withdrawnFee;
  return {
    balanceKop: received - withdrawn,
    receivedKop: received,
    withdrawnKop: withdrawn,
    guestPaidTipsKop: guestPaidTips,
  };
}
