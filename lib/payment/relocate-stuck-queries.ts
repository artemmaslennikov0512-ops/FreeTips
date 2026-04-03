/**
 * Запросы для мониторинга «зависшего» claim relocate (PENDING + relocateStartedAt давно в прошлом).
 */

import { db } from "@/lib/db";
import { TransactionStatus } from "@prisma/client";
import { RELOCATE_CLAIM_ALERT_AFTER_MS } from "@/lib/payment/relocate-constants";

type RelocateStuckRow = {
  id: string;
  relocateStartedAt: Date;
  recipientId: string;
  ageMs: number;
};

/** Размер выборки в админке и в /api/health/payment-relocate */
export const RELOCATE_STUCK_MONITORING_SAMPLE_LIMIT = 15;

export type RelocateStuckSampleJson = {
  id: string;
  recipientId: string;
  relocateStartedAt: string;
  ageMinutes: number;
};

function thresholdDate(olderThanMs: number): Date {
  return new Date(Date.now() - olderThanMs);
}

function stuckRelocateClaimWhere(olderThanMs: number) {
  return {
    status: TransactionStatus.PENDING,
    relocateStartedAt: { not: null, lt: thresholdDate(olderThanMs) },
  };
}

function serializeRelocateStuckRows(rows: RelocateStuckRow[]): RelocateStuckSampleJson[] {
  return rows.map((r) => ({
    id: r.id,
    recipientId: r.recipientId,
    relocateStartedAt: r.relocateStartedAt.toISOString(),
    ageMinutes: Math.round(r.ageMs / 60_000),
  }));
}

async function getRelocateClaimStuckCount(olderThanMs: number = RELOCATE_CLAIM_ALERT_AFTER_MS): Promise<number> {
  return db.transaction.count({ where: stuckRelocateClaimWhere(olderThanMs) });
}

async function getRelocateClaimStuckSample(
  olderThanMs: number = RELOCATE_CLAIM_ALERT_AFTER_MS,
  take: number = RELOCATE_STUCK_MONITORING_SAMPLE_LIMIT,
): Promise<RelocateStuckRow[]> {
  const rows = await db.transaction.findMany({
    where: stuckRelocateClaimWhere(olderThanMs),
    orderBy: { relocateStartedAt: "asc" },
    take,
    select: { id: true, relocateStartedAt: true, recipientId: true },
  });
  const now = Date.now();
  return rows.map((r) => {
    const started = r.relocateStartedAt!;
    return {
      id: r.id,
      relocateStartedAt: started,
      recipientId: r.recipientId,
      ageMs: now - started.getTime(),
    };
  });
}

/** Count + sample для админки и мониторинга (один Promise.all). */
export async function getRelocateStuckMonitoring(
  olderThanMs: number = RELOCATE_CLAIM_ALERT_AFTER_MS,
  sampleTake: number = RELOCATE_STUCK_MONITORING_SAMPLE_LIMIT,
): Promise<{ stuckCount: number; sampleJson: RelocateStuckSampleJson[] }> {
  const [stuckCount, rows] = await Promise.all([
    getRelocateClaimStuckCount(olderThanMs),
    getRelocateClaimStuckSample(olderThanMs, sampleTake),
  ]);
  return { stuckCount, sampleJson: serializeRelocateStuckRows(rows) };
}
