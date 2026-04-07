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

/**
 * Начало текущих календарных суток по Europe/Moscow (00:00).
 * В РФ постоянный UTC+3 (без перехода на летнее время).
 */
export function getMoscowDayStart(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${ymd}T00:00:00+03:00`);
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

/** Месячный лимит суммы поступлений (чаевые), коп — отдельно от лимита вывода; null — без лимита. */
export async function getEffectiveIncomingMonthlyLimitKop(userId: string): Promise<bigint | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { incomingMonthlyLimitKop: true },
  });
  const k = user?.incomingMonthlyLimitKop;
  if (k == null || k <= BigInt(0)) return null;
  return k;
}
