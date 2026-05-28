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

type FeePayerMode = "recipient" | "none" | "payer" | null;

function parseFeePayerMode(payerInfo: string | null): FeePayerMode {
  if (!payerInfo) return null;
  try {
    const payload = JSON.parse(payerInfo) as { paygineFeePayer?: unknown };
    const mode = payload.paygineFeePayer;
    if (mode === "recipient" || mode === "none" || mode === "payer") return mode;
  } catch {
    // ignore invalid json
  }
  return null;
}

/**
 * Эффективная комиссия входящего платежа, списываемая с получателя.
 * Если в БД feeKop отсутствует, но режим комиссии у получателя — досчитываем по формуле.
 */
export function recipientFeeKopForIncomingTx(input: {
  amountKop: bigint;
  feeKop: bigint | null;
  paymentMethod: "card" | "sbp" | null;
  payerInfo: string | null;
}): bigint {
  const stored = input.feeKop != null && input.feeKop > BigInt(0) ? input.feeKop : null;
  if (stored) return stored;
  const mode = parseFeePayerMode(input.payerInfo);
  if (mode !== "recipient") return BigInt(0);
  const method = input.paymentMethod === "sbp" ? "sbp" : "card";
  return BigInt(feeKopForIncoming(Number(input.amountKop), method));
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
  const mode = parseFeePayerMode(payerInfo);
  if (mode === "recipient" || mode === "none") {
    return amountKop;
  }
  const method = paymentMethod === "sbp" ? "sbp" : "card";
  const stored = feeKop != null && feeKop > BigInt(0) ? feeKop : null;
  const fee = stored ?? BigInt(feeKopForIncoming(Number(amountKop), method));
  return amountKop + fee;
}
