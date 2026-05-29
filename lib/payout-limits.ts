/**
 * Константы и хелперы лимитов вывода (антифрод).
 */

import { db } from "@/lib/db";
import { PAYOUT_MAX_AMOUNT_KOP } from "@/lib/payout-amount-bounds";

export const PAYOUT_DAILY_LIMIT_COUNT = 5;
export const PAYOUT_DAILY_LIMIT_KOP = BigInt("1000000"); // 10 000 ₽

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
  const [user, defaults] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { payoutDailyLimitCount: true, payoutDailyLimitKop: true },
    }),
    db.systemDefaultLimits.findUnique({
      where: { id: "default" },
      select: { payoutDailyLimitCount: true, payoutDailyLimitKop: true },
    }),
  ]);
  return {
    count: user?.payoutDailyLimitCount ?? defaults?.payoutDailyLimitCount ?? PAYOUT_DAILY_LIMIT_COUNT,
    kop: user?.payoutDailyLimitKop ?? defaults?.payoutDailyLimitKop ?? PAYOUT_DAILY_LIMIT_KOP,
  };
}

/** Эффективные месячные лимиты: только из профиля; если не заданы — null. */
export async function getEffectiveMonthlyPayoutLimits(userId: string): Promise<{
  count: number | null;
  kop: bigint | null;
}> {
  const [user, defaults] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { payoutMonthlyLimitCount: true, payoutMonthlyLimitKop: true },
    }),
    db.systemDefaultLimits.findUnique({
      where: { id: "default" },
      select: { payoutMonthlyLimitCount: true, payoutMonthlyLimitKop: true },
    }),
  ]);
  return {
    count: user?.payoutMonthlyLimitCount ?? defaults?.payoutMonthlyLimitCount ?? null,
    kop: user?.payoutMonthlyLimitKop ?? defaults?.payoutMonthlyLimitKop ?? null,
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

/**
 * Верхняя граница суммы одной заявки на вывод (коп) для подсказки в ЛК и клиентской валидации.
 * Совпадает с ограничениями POST /api/payouts и sd-pay-out-page: глобальный макс, порог автоподтверждения,
 * остаток по суточному и (если задан) месячному лимиту суммы.
 */
export function computeEffectiveMaxPayoutPerRequestKop(params: {
  autoConfirmPayoutThresholdKop: bigint | null;
  dailyLimitKop: bigint;
  todayCompletedSumKop: bigint;
  monthlyLimitKop: bigint | null;
  monthCompletedSumKop: bigint;
}): bigint {
  const globalMax = BigInt(PAYOUT_MAX_AMOUNT_KOP);
  let max = globalMax;

  const th = params.autoConfirmPayoutThresholdKop;
  if (th != null && th > BigInt(0) && th < max) {
    max = th;
  }

  const dailyLeft = params.dailyLimitKop - params.todayCompletedSumKop;
  const dailyCap = dailyLeft > BigInt(0) ? dailyLeft : BigInt(0);
  max = max < dailyCap ? max : dailyCap;

  if (params.monthlyLimitKop != null) {
    const monthLeft = params.monthlyLimitKop - params.monthCompletedSumKop;
    const monthCap = monthLeft > BigInt(0) ? monthLeft : BigInt(0);
    max = max < monthCap ? max : monthCap;
  }

  if (max < BigInt(0)) return BigInt(0);
  if (max > globalMax) return globalMax;
  return max;
}
