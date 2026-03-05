/**
 * Дефолтные настройки для новых официантов (RECIPIENT).
 * Задаются через .env — тогда каждый новый ЛК получает их без ручной настройки в админке.
 * Переменные опциональны; если не заданы — используются стандартные (автовывод выключен, лимиты глобальные).
 *
 * Пример в .env:
 *   DEFAULT_RECIPIENT_AUTO_CONFIRM_PAYOUTS=true
 *   DEFAULT_RECIPIENT_PAYOUT_DAILY_LIMIT_COUNT=10
 *   DEFAULT_RECIPIENT_PAYOUT_DAILY_LIMIT_KOP=500000
 */

export type DefaultRecipientSettings = {
  autoConfirmPayouts: boolean;
  autoConfirmPayoutThresholdKop: bigint | null;
  payoutDailyLimitCount: number | null;
  payoutDailyLimitKop: bigint | null;
  payoutMonthlyLimitCount: number | null;
  payoutMonthlyLimitKop: bigint | null;
};

function parseBool(val: string | undefined): boolean {
  if (val === undefined) return false;
  const v = val.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function parsePositiveInt(val: string | undefined): number | null {
  if (val === undefined || val.trim() === "") return null;
  const n = parseInt(val.trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parsePositiveBigInt(val: string | undefined): bigint | null {
  if (val === undefined || val.trim() === "") return null;
  const n = BigInt(val.trim());
  return n > BigInt(0) ? n : null;
}

/** Читает из process.env дефолты для новых официантов. */
export function getDefaultRecipientSettings(): DefaultRecipientSettings {
  return {
    autoConfirmPayouts: parseBool(process.env.DEFAULT_RECIPIENT_AUTO_CONFIRM_PAYOUTS),
    autoConfirmPayoutThresholdKop: parsePositiveBigInt(process.env.DEFAULT_RECIPIENT_AUTO_CONFIRM_THRESHOLD_KOP),
    payoutDailyLimitCount: parsePositiveInt(process.env.DEFAULT_RECIPIENT_PAYOUT_DAILY_LIMIT_COUNT),
    payoutDailyLimitKop: parsePositiveBigInt(process.env.DEFAULT_RECIPIENT_PAYOUT_DAILY_LIMIT_KOP),
    payoutMonthlyLimitCount: parsePositiveInt(process.env.DEFAULT_RECIPIENT_PAYOUT_MONTHLY_LIMIT_COUNT),
    payoutMonthlyLimitKop: parsePositiveBigInt(process.env.DEFAULT_RECIPIENT_PAYOUT_MONTHLY_LIMIT_KOP),
  };
}

/** Объект для Prisma user.update/create (только поля, заданные в дефолтах). */
export function getDefaultRecipientUpdateData(): Record<string, unknown> {
  const s = getDefaultRecipientSettings();
  const data: Record<string, unknown> = {};
  data.autoConfirmPayouts = s.autoConfirmPayouts;
  if (s.autoConfirmPayoutThresholdKop !== null) data.autoConfirmPayoutThresholdKop = s.autoConfirmPayoutThresholdKop;
  if (s.payoutDailyLimitCount !== null) data.payoutDailyLimitCount = s.payoutDailyLimitCount;
  if (s.payoutDailyLimitKop !== null) data.payoutDailyLimitKop = s.payoutDailyLimitKop;
  if (s.payoutMonthlyLimitCount !== null) data.payoutMonthlyLimitCount = s.payoutMonthlyLimitCount;
  if (s.payoutMonthlyLimitKop !== null) data.payoutMonthlyLimitKop = s.payoutMonthlyLimitKop;
  return data;
}
