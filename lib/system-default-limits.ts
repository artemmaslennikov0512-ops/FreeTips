/**
 * Дефолтные лимиты для новых пользователей (из блока антифрода админки).
 * При "Применить" в антифроде значения сохраняются сюда; при регистрации — подставляются новому пользователю.
 */

import { db } from "@/lib/db";
import { PAYOUT_DAILY_LIMIT_COUNT, PAYOUT_DAILY_LIMIT_KOP } from "@/lib/payout-limits";

const ID = "default";

export type SystemDefaultLimitsData = {
  payoutDailyLimitCount: number | null;
  payoutDailyLimitKop: bigint | null;
  payoutMonthlyLimitCount: number | null;
  payoutMonthlyLimitKop: bigint | null;
  autoConfirmPayouts: boolean;
  autoConfirmPayoutThresholdKop: bigint | null;
};

/** Данные для Prisma user.create/update (только поля лимитов и автоподтверждения). */
export type SystemDefaultLimitsUpdateData = {
  payoutDailyLimitCount?: number | null;
  payoutDailyLimitKop?: bigint | null;
  payoutMonthlyLimitCount?: number | null;
  payoutMonthlyLimitKop?: bigint | null;
  autoConfirmPayouts?: boolean;
  autoConfirmPayoutThresholdKop?: bigint | null;
};

/**
 * Возвращает дефолтные лимиты для нового пользователя.
 * Если в БД заданы — используются они; иначе — константы из payout-limits и false/null для остального.
 */
export async function getSystemDefaultLimitsForNewUser(): Promise<Record<string, unknown>> {
  const row = await db.systemDefaultLimits.findUnique({
    where: { id: ID },
  });

  const data: Record<string, unknown> = {
    payoutDailyLimitCount: row?.payoutDailyLimitCount ?? PAYOUT_DAILY_LIMIT_COUNT,
    payoutDailyLimitKop: row?.payoutDailyLimitKop ?? PAYOUT_DAILY_LIMIT_KOP,
    payoutMonthlyLimitCount: row?.payoutMonthlyLimitCount ?? null,
    payoutMonthlyLimitKop: row?.payoutMonthlyLimitKop ?? null,
    autoConfirmPayouts: row?.autoConfirmPayouts ?? false,
    autoConfirmPayoutThresholdKop: row?.autoConfirmPayoutThresholdKop ?? null,
  };

  return data;
}

/**
 * Сохраняет (частично) дефолтные лимиты. Вызывается при "Применить" в блоке антифрода.
 * Переданные поля обновляются; непереданные не трогают существующую запись.
 */
export async function saveSystemDefaultLimits(partial: SystemDefaultLimitsUpdateData): Promise<void> {
  const update: {
    payoutDailyLimitCount?: number | null;
    payoutDailyLimitKop?: bigint | null;
    payoutMonthlyLimitCount?: number | null;
    payoutMonthlyLimitKop?: bigint | null;
    autoConfirmPayouts?: boolean;
    autoConfirmPayoutThresholdKop?: bigint | null;
  } = {};
  if (partial.payoutDailyLimitCount !== undefined) update.payoutDailyLimitCount = partial.payoutDailyLimitCount;
  if (partial.payoutDailyLimitKop !== undefined) update.payoutDailyLimitKop = partial.payoutDailyLimitKop;
  if (partial.payoutMonthlyLimitCount !== undefined) update.payoutMonthlyLimitCount = partial.payoutMonthlyLimitCount;
  if (partial.payoutMonthlyLimitKop !== undefined) update.payoutMonthlyLimitKop = partial.payoutMonthlyLimitKop;
  if (partial.autoConfirmPayouts !== undefined) update.autoConfirmPayouts = partial.autoConfirmPayouts;
  if (partial.autoConfirmPayoutThresholdKop !== undefined) update.autoConfirmPayoutThresholdKop = partial.autoConfirmPayoutThresholdKop;

  if (Object.keys(update).length === 0) return;

  const existing = await db.systemDefaultLimits.findUnique({ where: { id: ID } });
  if (existing) {
    await db.systemDefaultLimits.update({
      where: { id: ID },
      data: update,
    });
  } else {
    await db.systemDefaultLimits.create({
      data: {
        id: ID,
        payoutDailyLimitCount: update.payoutDailyLimitCount ?? null,
        payoutDailyLimitKop: update.payoutDailyLimitKop ?? null,
        payoutMonthlyLimitCount: update.payoutMonthlyLimitCount ?? null,
        payoutMonthlyLimitKop: update.payoutMonthlyLimitKop ?? null,
        autoConfirmPayouts: update.autoConfirmPayouts ?? false,
        autoConfirmPayoutThresholdKop: update.autoConfirmPayoutThresholdKop ?? null,
      },
    });
  }
}
