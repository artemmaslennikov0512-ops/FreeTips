/**
 * Комиссии Paygine по документу (Оглавление1, Таблица 1).
 * В Register передаём amount и fee; amount зачисляется на кубышку, fee взимается с плательщика дополнительно и не поступает на кубышку.
 * Разделение при переливе (fee → ЮЛ, остаток → официант) — только для СБП; по карте весь amount идёт официанту.
 */

/** Процент комиссии при выводе на карту (SDPayOut). С кубышки списывается amount + fee, на карту зачисляется amount. */
export const FEE_PERCENT_PAYOUT_CARD = 1.2;

/** Процент комиссии при приёме по QR (СБП). Взимается с плательщика дополнительно к amount; amount зачисляется на кубышку. */
export const FEE_PERCENT_IN_QR_SBP = 2.5;

/** Процент комиссии при приёме по номеру карты. Взимается с плательщика дополнительно к amount; amount зачисляется на кубышку. */
export const FEE_PERCENT_IN_CARD = 4;

export function feeKopForPayout(amountKop: number): number {
  return Math.round((amountKop * FEE_PERCENT_PAYOUT_CARD) / 100);
}

export function feeKopForIncoming(amountKop: number, paymentMethod: "card" | "sbp"): number {
  const percent = paymentMethod === "sbp" ? FEE_PERCENT_IN_QR_SBP : FEE_PERCENT_IN_CARD;
  return Math.round((amountKop * percent) / 100);
}
