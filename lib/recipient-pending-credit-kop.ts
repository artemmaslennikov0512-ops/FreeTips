/**
 * Оценка суммы к зачислению получателю (официант/пул) по незавершённому платежу —
 * в том же смысле, что и в lib/balance.ts для SUCCESS.
 */

import { feeKopForIncoming } from "@/lib/payment/paygine-fee";
import { parseTipSplitFromPayerInfo, poolShareKopFromNet } from "@/lib/tip-routing";

export type PendingTxCreditRow = {
  amountKop: bigint;
  feeKop: bigint | null;
  establishmentShareKop: bigint | null;
  paymentMethod: string | null;
  payerInfo: string | null;
};

function feeForTx(row: PendingTxCreditRow): bigint {
  const amountNum = Number(row.amountKop);
  if (!Number.isFinite(amountNum) || amountNum <= 0) return BigInt(0);
  const method = row.paymentMethod === "sbp" ? "sbp" : "card";
  return row.feeKop ?? BigInt(feeKopForIncoming(amountNum, method));
}

/** Сколько копеек получит recipientId этого Transaction при успешной оплате (оценка для PENDING). */
export function pendingNetCreditToRecipientKop(row: PendingTxCreditRow): bigint {
  const fee = feeForTx(row);
  let share = row.establishmentShareKop ?? BigInt(0);
  if (share === BigInt(0)) {
    const split = parseTipSplitFromPayerInfo(row.payerInfo);
    if (split) {
      const netAfterFee = row.amountKop - fee;
      if (netAfterFee > BigInt(0)) {
        share = poolShareKopFromNet(netAfterFee, split.establishmentSharePercent);
      }
    }
  }
  return row.amountKop - fee - share;
}

/** Ожидаемая сумма к зачислению получателю для нового платежа (до сохранения в БД). */
export function projectedNetCreditForNewTipKop(input: {
  amountKop: bigint;
  tipSplit: { establishmentSharePercent: number } | null;
}): bigint {
  const amountNum = Number(input.amountKop);
  const fee = BigInt(feeKopForIncoming(amountNum, "card"));
  const netAfterFee = input.amountKop - fee;
  if (netAfterFee <= BigInt(0)) return BigInt(0);
  const split = input.tipSplit;
  if (!split || split.establishmentSharePercent <= 0) return netAfterFee;
  const share = poolShareKopFromNet(netAfterFee, split.establishmentSharePercent);
  return netAfterFee - share;
}
