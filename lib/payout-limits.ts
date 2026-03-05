/**
 * Константы и хелперы лимитов вывода (антифрод).
 */

import { db } from "@/lib/db";

export const PAYOUT_DAILY_LIMIT_COUNT = 5;
export const PAYOUT_DAILY_LIMIT_KOP = BigInt("20000000"); // 200 000 ₽

/** Начало текущих суток по UTC. */
export function getUtcDayStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Начало текущего месяца по UTC. */
export function getUtcMonthStart(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Эффективные суточные лимиты для пользователя: из профиля или глобальные. */
export async function getEffectivePayoutLimits(userId: string): Promise<{
  count: number;
  kop: bigint;
}> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { payoutDailyLimitCount: true, payoutDailyLimitKop: true },
  });
  return {
    count: user?.payoutDailyLimitCount ?? PAYOUT_DAILY_LIMIT_COUNT,
    kop: user?.payoutDailyLimitKop ?? PAYOUT_DAILY_LIMIT_KOP,
  };
}

/** Эффективные месячные лимиты: только из профиля; если не заданы — null. */
export async function getEffectiveMonthlyPayoutLimits(userId: string): Promise<{
  count: number | null;
  kop: bigint | null;
}> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { payoutMonthlyLimitCount: true, payoutMonthlyLimitKop: true },
  });
  return {
    count: user?.payoutMonthlyLimitCount ?? null,
    kop: user?.payoutMonthlyLimitKop ?? null,
  };
}
