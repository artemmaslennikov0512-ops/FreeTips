/**
 * Комиссии Paygine по документу (Оглавление1, Таблица 1).
 * В Register передаём amount и fee; amount зачисляется на кубышку, fee взимается с плательщика дополнительно и не поступает на кубышку.
 * Разделение при переливе (fee → ЮЛ, остаток → официант) — только для СБП; по карте весь amount идёт официанту.
 */

/** Процент комиссии при выводе на карту (SDPayOut). С кубышки списывается amount + fee, на карту зачисляется amount. */
export const FEE_PERCENT_PAYOUT_CARD = 1;

/** Минимальная комиссия за вывод (копейки), если процент даёт меньше — берётся этот минимум. */
export const FEE_MIN_PAYOUT_KOP = 3000;

/** Процент комиссии при приёме по QR (СБП). Взимается с плательщика дополнительно к amount; amount зачисляется на кубышку. */
const FEE_PERCENT_IN_QR_SBP = 2.5;

/** Процент комиссии при приёме по карте (основной канал в проде). Взимается с плательщика дополнительно к amount; amount зачисляется на кубышку. */
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
 * Списание с гостя по Register: amountKop + комиссия сверху (карта/СБП — один процент в `feeKopForIncoming`).
 * Берём fee из БД, только если оно задано и > 0. Иначе считаем по сумме заказа (как при Register):
 * `feeKop ?? расчёт` недостаточно — в БД часто бывает 0, а не null, тогда без комиссии занижается totalGuestPaidTipsKop и пуш «+50 ₽» вместо «+51 ₽».
 */
export function guestChargedKopForIncomingCardOrder(
  amountKop: bigint,
  feeKop: bigint | null,
  paymentMethod: "card" | "sbp" | null = "card",
): bigint {
  const method = paymentMethod === "sbp" ? "sbp" : "card";
  const stored = feeKop != null && feeKop > BigInt(0) ? feeKop : null;
  const fee = stored ?? BigInt(feeKopForIncoming(Number(amountKop), method));
  return amountKop + fee;
}
