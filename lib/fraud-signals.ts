/**
 * Запись сигналов антифрода для админки (наблюдение). Ошибки записи не пробрасываются наружу.
 */

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logError } from "@/lib/logger";

export const FRAUD_RULE = {
  LOGIN_WRONG_PASSWORD: "LOGIN_WRONG_PASSWORD",
  LOGIN_BLOCKED_ACCOUNT: "LOGIN_BLOCKED_ACCOUNT",
  PAYOUT_LIMIT_DAILY_COUNT: "PAYOUT_LIMIT_DAILY_COUNT",
  PAYOUT_LIMIT_DAILY_KOP: "PAYOUT_LIMIT_DAILY_KOP",
  PAYOUT_LIMIT_MONTHLY_COUNT: "PAYOUT_LIMIT_MONTHLY_COUNT",
  PAYOUT_LIMIT_MONTHLY_KOP: "PAYOUT_LIMIT_MONTHLY_KOP",
  PAY_RECIPIENT_BLOCKED: "PAY_RECIPIENT_BLOCKED",
  PAY_POLICY_BLOCKED: "PAY_POLICY_BLOCKED",
  /** Наблюдение: частые заявки на вывод за короткий интервал (без отказа в операции) */
  PAYOUT_VELOCITY_HOURLY: "PAYOUT_VELOCITY_HOURLY",
  /** Наблюдение: много созданных заказов на одну ссылку за короткое время */
  PAY_INIT_BURST_SLUG: "PAY_INIT_BURST_SLUG",
  /** Наблюдение: много успешных оплат с одного IP за короткое время (получатель — в сигнале) */
  PAY_SUCCESS_BURST_IP: "PAY_SUCCESS_BURST_IP",
  /** Наблюдение: несколько учётных записей с одного IP (вход/регистрация) */
  ACCOUNT_SHARED_AUTH_IP: "ACCOUNT_SHARED_AUTH_IP",
} as const;

export type FraudRuleCode = (typeof FRAUD_RULE)[keyof typeof FRAUD_RULE];

type RecordParams = {
  userId: string;
  ruleCode: string;
  message: string;
  metadata?: Record<string, unknown>;
  /** Не создавать запись, если за окно уже есть сигнал с тем же ruleCode для этого пользователя */
  dedupeMinutes?: number;
};

export async function recordFraudSignal(params: RecordParams): Promise<void> {
  try {
    if (params.dedupeMinutes != null && params.dedupeMinutes > 0) {
      const since = new Date(Date.now() - params.dedupeMinutes * 60 * 1000);
      const existing = await db.fraudSignal.findFirst({
        where: {
          userId: params.userId,
          ruleCode: params.ruleCode,
          createdAt: { gte: since },
        },
        select: { id: true },
      });
      if (existing) return;
    }

    await db.fraudSignal.create({
      data: {
        userId: params.userId,
        ruleCode: params.ruleCode,
        message: params.message.slice(0, 500),
        metadata:
          params.metadata != null ? (params.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (e) {
    logError("fraud_signal.record_failed", e, {
      userId: params.userId,
      ruleCode: params.ruleCode,
    });
  }
}
