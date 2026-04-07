/**
 * Лимиты приёма на получателя:
 * — суточная сумма входящих (МСК) из настроек платформы (внутренний антиотмывочный потолок);
 * — месячная сумма поступлений по полю incomingMonthlyLimitKop в профиле (UTC-месяц);
 * — число успешных зачислений за сутки МСК, одновременные PENDING, интервал от последнего создания заказа.
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
export const PUBLIC_PLATFORM_DAILY_LIMIT_MESSAGE =
  "Приём чаевых временно недоступен. Напишите в поддержку — мы поможем.";

export type RecipientPayLimitSettings = {
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
export function effectiveMaxIncomingKopPerMskDay(settings: RecipientPayLimitSettings): bigint | null {
  const c = settings.recipientMaxIncomingKopPerMskDay;
  if (c == null) return null;
  if (c <= BigInt(0)) return null;
  return c;
}

/** null или &lt; 1 — пауза между заказами отключена. */
export function effectiveMinMinutesBetweenPayInits(settings: RecipientPayLimitSettings): number | null {
  const w = settings.recipientMinMinutesBetweenPayInits;
  if (w == null || !Number.isFinite(w)) return null;
  const i = Math.floor(w);
  if (i < 1) return null;
  return Math.min(i, 10080);
}

/** null или &lt; 1 — лимит одновременных PENDING отключён. */
export function effectiveMaxConcurrentPendingPayments(settings: RecipientPayLimitSettings): number | null {
  const n = settings.recipientMaxConcurrentPendingPayments;
  if (n == null || !Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i < 1) return null;
  return Math.min(i, 100);
}

/** null или &lt; 1 — суточный лимит успешных зачислений отключён. */
export function effectiveMaxPayInitsPerDay(settings: RecipientPayLimitSettings): number | null {
  const n = settings.recipientMaxPayInitsPerDay;
  if (n == null || !Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i < 1) return null;
  return Math.min(i, 50_000);
}

/**
 * Сумма поступлений за календарные сутки МСК: SUCCESS с updatedAt с полуночи МСК (факт зачисления) +
 * PENDING, созданные сегодня (резерв).
 */
async function sumIncomingNetKopMskDay(recipientId: string, dayStart: Date): Promise<bigint> {
  const rows = await db.transaction.findMany({
    where: {
      recipientId,
      OR: [
        { status: TransactionStatus.PENDING, createdAt: { gte: dayStart } },
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
 * Учёт месячного лимита поступлений (UTC-месяц):
 * SUCCESS с updatedAt в месяце + PENDING, созданные в этом месяце.
 */
export async function sumIncomingReservedNetKopUtcMonth(
  recipientId: string,
  monthStartUtc: Date,
): Promise<bigint> {
  const rows = await db.transaction.findMany({
    where: {
      recipientId,
      OR: [
        { status: TransactionStatus.PENDING, createdAt: { gte: monthStartUtc } },
        { status: TransactionStatus.SUCCESS, updatedAt: { gte: monthStartUtc } },
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

async function countAllPending(recipientId: string): Promise<number> {
  return db.transaction.count({
    where: { recipientId, status: TransactionStatus.PENDING },
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

export type EvaluateRecipientPayLimitsInput = {
  recipientId: string;
  amountKop: bigint;
  tipSplit: TipSplitSnapshot | null;
  limits: RecipientPayLimitSettings;
  idempotencyKey?: string;
};

export type EvaluateRecipientPayLimitsOptions = {
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

  if (needDaily || needMonthly) {
    const moscowDayStart = getMoscowDayStart();
    const monthStartUtc = getUtcMonthStart();
    const [daySum, monthSum] = await Promise.all([
      needDaily ? sumIncomingNetKopMskDay(recipientId, moscowDayStart) : Promise.resolve(BigInt(0)),
      needMonthly
        ? sumIncomingReservedNetKopUtcMonth(recipientId, monthStartUtc)
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
    const n = await countAllPending(recipientId);
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
