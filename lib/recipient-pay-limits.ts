/**
 * Лимиты приёма на получателя:
 * — суточная сумма (МСК): SUCCESS за сегодня + только «свежие» PENDING (см. pendingCreatedLowerBound);
 * — месячная сумма: только SUCCESS за UTC-месяц;
 * — успешные зачисления за сутки МСК, одновременные свежие PENDING, интервал между созданиями.
 */

import { db } from "@/lib/db";
import {
  getEffectiveIncomingMonthlyLimitKop,
  getMoscowDayStart,
  getUtcMonthStart,
} from "@/lib/payout-limits";
import type { TipSplitSnapshot } from "@/lib/payment/gateway";
import {
  pendingNetCreditToRecipientKop,
  projectedNetCreditForNewTipKop,
  type PendingTxCreditRow,
} from "@/lib/recipient-pending-credit-kop";
import { PAYMENT_MIN_AMOUNT_KOP } from "@/lib/payment-amount-bounds";
import { TransactionStatus } from "@prisma/client";

/** Сообщение гостю на /pay при срабатывании внутренних суточных лимитов платформы (сумма / число успехов). */
const PUBLIC_PLATFORM_DAILY_LIMIT_MESSAGE =
  "Приём чаевых временно недоступен. Напишите в поддержку — мы поможем.";

type RecipientPayLimitSettings = {
  recipientMaxIncomingKopPerMskDay: bigint | null;
  recipientMaxConcurrentPendingPayments: number | null;
  recipientMinMinutesBetweenPayInits: number | null;
  recipientMaxPayInitsPerDay: number | null;
};

function successNetToRecipientKop(r: {
  amountKop: bigint;
  feeKop: bigint | null;
  establishmentShareKop: bigint | null;
}): bigint {
  const fee = r.feeKop ?? BigInt(0);
  const share = r.establishmentShareKop ?? BigInt(0);
  return r.amountKop - fee - share;
}

/** null или ≤0 — без суточного лимита по сумме. */
function effectiveMaxIncomingKopPerMskDay(settings: RecipientPayLimitSettings): bigint | null {
  const c = settings.recipientMaxIncomingKopPerMskDay;
  if (c == null) return null;
  if (c <= BigInt(0)) return null;
  return c;
}

/** null или &lt; 1 — пауза между заказами отключена. */
function effectiveMinMinutesBetweenPayInits(settings: RecipientPayLimitSettings): number | null {
  const w = settings.recipientMinMinutesBetweenPayInits;
  if (w == null || !Number.isFinite(w)) return null;
  const i = Math.floor(w);
  if (i < 1) return null;
  return Math.min(i, 10080);
}

/** null или &lt; 1 — лимит одновременных PENDING отключён. */
function effectiveMaxConcurrentPendingPayments(settings: RecipientPayLimitSettings): number | null {
  const n = settings.recipientMaxConcurrentPendingPayments;
  if (n == null || !Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i < 1) return null;
  return Math.min(i, 100);
}

/** null или &lt; 1 — суточный лимит успешных зачислений отключён. */
function effectiveMaxPayInitsPerDay(settings: RecipientPayLimitSettings): number | null {
  const n = settings.recipientMaxPayInitsPerDay;
  if (n == null || !Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i < 1) return null;
  return Math.min(i, 50_000);
}

/** Сколько минут PENDING считается «активным» для суточной суммы и слотов: интервал из настроек или 5. */
export function pendingFreshnessMinutesForLimits(settings: RecipientPayLimitSettings): number {
  return effectiveMinMinutesBetweenPayInits(settings) ?? 5;
}

/**
 * Нижняя граница createdAt для PENDING: не старше freshness от now и не раньше полуночи МСК (сутки).
 */
export function pendingCreatedLowerBound(
  moscowDayStart: Date,
  settings: RecipientPayLimitSettings,
  now: Date = new Date(),
): Date {
  const min = pendingFreshnessMinutesForLimits(settings);
  const freshLine = new Date(now.getTime() - min * 60_000);
  return freshLine > moscowDayStart ? freshLine : moscowDayStart;
}

/**
 * Сумма за сутки МСК: SUCCESS с updatedAt с полуночи МСК + PENDING с createdAt ≥ pendingCreatedSince
 * (неоплаченные дольше окна «свежести» не резервируют суточный лимит и не занимают слоты).
 */
async function sumIncomingNetKopMskDay(
  recipientId: string,
  dayStart: Date,
  pendingCreatedSince: Date,
): Promise<bigint> {
  const rows = await db.transaction.findMany({
    where: {
      recipientId,
      OR: [
        { status: TransactionStatus.PENDING, createdAt: { gte: pendingCreatedSince } },
        { status: TransactionStatus.SUCCESS, updatedAt: { gte: dayStart } },
      ],
    },
    select: {
      status: true,
      amountKop: true,
      feeKop: true,
      establishmentShareKop: true,
      paymentMethod: true,
      payerInfo: true,
    },
  });
  let sum = BigInt(0);
  for (const r of rows) {
    if (r.status === TransactionStatus.PENDING) {
      sum += pendingNetCreditToRecipientKop(r as PendingTxCreditRow);
    } else {
      sum += successNetToRecipientKop(r);
    }
  }
  return sum;
}

/**
 * Сумма успешно зачисленных чаевых за UTC-месяц (по времени зачисления) — нетто получателю, как в балансе.
 * Месячный лимит поступлений и прогресс в ЛК считаются только по SUCCESS, без резерва по PENDING.
 */
export async function sumIncomingSuccessNetKopUtcMonth(
  recipientId: string,
  monthStartUtc: Date,
): Promise<bigint> {
  const rows = await db.transaction.findMany({
    where: {
      recipientId,
      status: TransactionStatus.SUCCESS,
      updatedAt: { gte: monthStartUtc },
    },
    select: {
      amountKop: true,
      feeKop: true,
      establishmentShareKop: true,
    },
  });
  let sum = BigInt(0);
  for (const r of rows) {
    sum += successNetToRecipientKop(r);
  }
  return sum;
}

async function countFreshPending(recipientId: string, pendingCreatedSince: Date): Promise<number> {
  return db.transaction.count({
    where: {
      recipientId,
      status: TransactionStatus.PENDING,
      createdAt: { gte: pendingCreatedSince },
    },
  });
}

async function lastPayInitAt(recipientId: string): Promise<Date | null> {
  const row = await db.transaction.findFirst({
    where: { recipientId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return row?.createdAt ?? null;
}

/** Успешные зачисления на получателя за календарные сутки МСК (по времени зачисления). */
async function countSuccessfulIncomingCreditsSinceMoscowDayStart(
  recipientId: string,
  dayStart: Date,
): Promise<number> {
  return db.transaction.count({
    where: {
      recipientId,
      status: TransactionStatus.SUCCESS,
      updatedAt: { gte: dayStart },
    },
  });
}

type EvaluateRecipientPayLimitsInput = {
  recipientId: string;
  amountKop: bigint;
  tipSplit: TipSplitSnapshot | null;
  limits: RecipientPayLimitSettings;
  idempotencyKey?: string;
};

type EvaluateRecipientPayLimitsOptions = {
  /** Не раскрывать гостю тексты про внутренние суточные лимиты платформы (сумма / число успехов за день). */
  obscurePlatformDailyLimits?: boolean;
};

export async function evaluateRecipientPayLimits(
  input: EvaluateRecipientPayLimitsInput,
  options?: EvaluateRecipientPayLimitsOptions,
): Promise<string | null> {
  const { recipientId, amountKop, tipSplit, limits } = input;
  const obscureDaily = options?.obscurePlatformDailyLimits === true;

  if (input.idempotencyKey?.trim()) {
    const existing = await db.transaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey.trim() },
      select: { status: true, recipientId: true },
    });
    if (existing?.status === TransactionStatus.PENDING && existing.recipientId === recipientId) {
      return null;
    }
  }

  const projected = projectedNetCreditForNewTipKop({ amountKop, tipSplit });

  const maxPerDaySuccessCount = effectiveMaxPayInitsPerDay(limits);
  if (maxPerDaySuccessCount != null) {
    const dayStart = getMoscowDayStart();
    const todaySuccesses = await countSuccessfulIncomingCreditsSinceMoscowDayStart(recipientId, dayStart);
    if (todaySuccesses >= maxPerDaySuccessCount) {
      return obscureDaily
        ? PUBLIC_PLATFORM_DAILY_LIMIT_MESSAGE
        : `Достигнут лимит: не более ${maxPerDaySuccessCount} успешных зачислений за сутки (по Москве). Следующая попытка после 00:00 МСК.`;
    }
  }

  const dailyKopCap = effectiveMaxIncomingKopPerMskDay(limits);
  const monthlyKopCap = await getEffectiveIncomingMonthlyLimitKop(recipientId);

  const needDaily = dailyKopCap != null;
  const needMonthly = monthlyKopCap != null;

  const moscowDayStart = getMoscowDayStart();
  const pendingCreatedSince = pendingCreatedLowerBound(moscowDayStart, limits);

  if (needDaily || needMonthly) {
    const monthStartUtc = getUtcMonthStart();
    const [daySum, monthSum] = await Promise.all([
      needDaily ? sumIncomingNetKopMskDay(recipientId, moscowDayStart, pendingCreatedSince) : Promise.resolve(BigInt(0)),
      needMonthly
        ? sumIncomingSuccessNetKopUtcMonth(recipientId, monthStartUtc)
        : Promise.resolve(BigInt(0)),
    ]);

    if (dailyKopCap != null && daySum + projected > dailyKopCap) {
      return obscureDaily
        ? PUBLIC_PLATFORM_DAILY_LIMIT_MESSAGE
        : "Достигнут суточный лимит суммы входящих чаевых для этого получателя (по Москве). Попробуйте завтра.";
    }

    if (monthlyKopCap != null && monthSum + projected > monthlyKopCap) {
      return "Достигнут месячный лимит суммы поступлений на счёт получателя. Попробуйте позже или свяжитесь с поддержкой.";
    }
  }

  const maxConcurrent = effectiveMaxConcurrentPendingPayments(limits);
  if (maxConcurrent != null) {
    const n = await countFreshPending(recipientId, pendingCreatedSince);
    if (n >= maxConcurrent) {
      return "Превышен лимит одновременных заявок на оплату. Пожалуйста, повторите попытку позже. Если платёж уже начат — завершите его в приложении банка.";
    }
  }

  const minGapMin = effectiveMinMinutesBetweenPayInits(limits);
  if (minGapMin != null) {
    const lastAt = await lastPayInitAt(recipientId);
    if (lastAt != null) {
      const elapsedMs = Date.now() - lastAt.getTime();
      const needMs = minGapMin * 60 * 1000;
      if (elapsedMs < needMs) {
        const waitMin = Math.max(1, Math.ceil((needMs - elapsedMs) / 60_000));
        return `Следующую оплату можно начать примерно через ${waitMin} мин.`;
      }
    }
  }

  return null;
}

export async function evaluateRecipientPayLimitsForPayPage(
  input: {
    recipientId: string;
    tipSplit: TipSplitSnapshot | null;
    limits: RecipientPayLimitSettings;
  },
  options?: EvaluateRecipientPayLimitsOptions,
): Promise<string | null> {
  return evaluateRecipientPayLimits(
    {
      recipientId: input.recipientId,
      amountKop: BigInt(PAYMENT_MIN_AMOUNT_KOP),
      tipSplit: input.tipSplit,
      limits: input.limits,
    },
    options,
  );
}
