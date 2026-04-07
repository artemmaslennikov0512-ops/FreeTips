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
  if (row.feeKop != null) return row.feeKop;
  // Карта: комиссия у плательщика поверх суммы заказа в Paygine; amountKop — сумма к распределению, не уменьшаем на оценку.
  if (row.paymentMethod !== "sbp") return BigInt(0);
  const amountNum = Number(row.amountKop);
  if (!Number.isFinite(amountNum) || amountNum <= 0) return BigInt(0);
  return BigInt(feeKopForIncoming(amountNum, "sbp"));
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
  if (!Number.isFinite(amountNum) || amountNum <= 0) return BigInt(0);
  const split = input.tipSplit;
  if (!split || split.establishmentSharePercent <= 0) return input.amountKop;
  const share = poolShareKopFromNet(input.amountKop, split.establishmentSharePercent);
  return input.amountKop - share;
}
