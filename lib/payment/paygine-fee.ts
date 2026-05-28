/**
 * Комиссии Paygine по документу (Оглавление1, Таблица 1).
 * Для входящих платежей комиссия считается от amount и списывается с получателя чаевых (из amount),
 * а не с гостя: гость платит только сумму чаевых.
 */

/** Процент комиссии при выводе на карту (SDPayOut). С кубышки списывается amount + fee, на карту зачисляется amount. */
export const FEE_PERCENT_PAYOUT_CARD = 1;

/** Минимальная комиссия за вывод (копейки), если процент даёт меньше — берётся этот минимум. */
export const FEE_MIN_PAYOUT_KOP = 3000;

/** Процент комиссии при приёме по QR (СБП). */
const FEE_PERCENT_IN_QR_SBP = 2.5;

/** Процент комиссии при приёме по карте (основной канал в проде). */
const FEE_PERCENT_IN_CARD = 2.5;

export function feeKopForPayout(amountKop: number): number {
  if (!Number.isFinite(amountKop) || amountKop <= 0) return 0;
  const fromPercent = Math.round((amountKop * FEE_PERCENT_PAYOUT_CARD) / 100);
  return Math.max(FEE_MIN_PAYOUT_KOP, fromPercent);
}

export function feeKopForIncoming(amountKop: number, paymentMethod: "card" | "sbp"): number {
  const percent = paymentMethod === "sbp" ? FEE_PERCENT_IN_QR_SBP : FEE_PERCENT_IN_CARD;
  return Math.round((amountKop * percent) / 100);
}

/**
 * Сколько списано с гостя по входящему платежу.
 * Исторически fee взимался с гостя; в новом режиме fee списывается с получателя
 * (`payerInfo.paygineFeePayer = "recipient"`), и с гостя уходит только amountKop.
 */
export function guestChargedKopForIncomingCardOrder(
  amountKop: bigint,
  feeKop: bigint | null,
  paymentMethod: "card" | "sbp" | null = "card",
  payerInfo: string | null = null,
): bigint {
  if (payerInfo) {
    try {
      const payload = JSON.parse(payerInfo) as { paygineFeePayer?: unknown };
      if (payload.paygineFeePayer === "recipient" || payload.paygineFeePayer === "none") {
        return amountKop;
      }
    } catch {
      // Невалидный JSON не должен ломать профиль/баланс.
    }
  }
  const method = paymentMethod === "sbp" ? "sbp" : "card";
  const stored = feeKop != null && feeKop > BigInt(0) ? feeKop : null;
  const fee = stored ?? BigInt(feeKopForIncoming(Number(amountKop), method));
  return amountKop + fee;
}
