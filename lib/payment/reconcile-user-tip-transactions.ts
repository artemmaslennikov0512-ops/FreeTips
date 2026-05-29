import { TransactionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { logInfo } from "@/lib/logger";
import { syncTipTransactionFromPaygine } from "@/lib/payment/sync-tip-from-paygine";

const DEFAULT_INTERVAL_SEC = 120;
const DEFAULT_LOOKBACK_HOURS = 48;
const DEFAULT_BATCH = 12;

const lastRunByUserId = new Map<string, number>();
const inFlightByUserId = new Set<string>();

function reconcileIntervalMs(): number {
  const raw = Number(process.env.PAYGINE_USER_RECONCILE_INTERVAL_SEC);
  if (Number.isFinite(raw) && raw >= 10 && raw <= 3600) return raw * 1000;
  return DEFAULT_INTERVAL_SEC * 1000;
}

function reconcileLookbackHours(): number {
  const raw = Number(process.env.PAYGINE_USER_RECONCILE_LOOKBACK_HOURS);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 24 * 14) return raw;
  return DEFAULT_LOOKBACK_HOURS;
}

function reconcileBatchSize(): number {
  const raw = Number(process.env.PAYGINE_USER_RECONCILE_BATCH);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 100) return Math.floor(raw);
  return DEFAULT_BATCH;
}

export function shouldRunUserTipReconcileNow(userId: string): boolean {
  const now = Date.now();
  const last = lastRunByUserId.get(userId) ?? 0;
  return now - last >= reconcileIntervalMs();
}

/**
 * Неблокирующая «самосверка» статусов/переливов с Paygine для пользователя ЛК.
 * Запускается по таймеру и только для последних транзакций пользователя.
 */
export async function reconcileRecentTipsForUserIfDue(userId: string): Promise<void> {
  if (!userId) return;
  if (!shouldRunUserTipReconcileNow(userId)) return;
  if (inFlightByUserId.has(userId)) return;

  inFlightByUserId.add(userId);
  lastRunByUserId.set(userId, Date.now());

  try {
    const since = new Date(Date.now() - reconcileLookbackHours() * 60 * 60 * 1000);
    const txs = await db.transaction.findMany({
      where: {
        recipientId: userId,
        externalId: { not: null },
        status: { in: [TransactionStatus.PENDING, TransactionStatus.SUCCESS] },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: reconcileBatchSize(),
      select: { id: true },
    });

    if (txs.length === 0) return;

    let recovered = 0;
    let failed = 0;
    for (const tx of txs) {
      const r = await syncTipTransactionFromPaygine(tx.id);
      if (r.recovered) recovered += 1;
      if (!r.ok) failed += 1;
    }

    if (recovered > 0 || failed > 0) {
      logInfo("payment.reconcile_user_tips.done", {
        userId,
        scanned: txs.length,
        recovered,
        failed,
      });
    }
  } catch (error) {
    logInfo("payment.reconcile_user_tips.error", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    inFlightByUserId.delete(userId);
  }
}
