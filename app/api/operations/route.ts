/**
 * GET /api/operations — единая история операций (пополнения + выводы).
 * Поддержка: Bearer (кабинет) и X-API-Key (приложение).
 * Query:
 * - limit (default 50), offset (default 0)
 * - since (ISO datetime, optional) — вернуть только новые операции после указанного времени.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrApiKey } from "@/lib/auth-or-api-key";
import { db } from "@/lib/db";
import { parseLimitOffset } from "@/lib/api/helpers";
import { feeKopForPayout } from "@/lib/payment/paygine-fee";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";
import { logInfo } from "@/lib/logger";
import { reconcileRecentTipsForUserIfDue } from "@/lib/payment/reconcile-user-tip-transactions";

export type OperationItem = {
  id: string;
  type: "tip" | "payout";
  amountKop: number;
  feeKop: number; // комиссия в копейках (для вывода — из БД или расчёт; для пополнения — из БД или 0)
  status: string;
  /** Причина отклонения (только для выводов со статусом REJECTED). */
  rejectionReason?: string | null;
  /** URL страницы приёма чаевых (офика), по которой видно, кому идёт чай. Только для type "tip". */
  paymentPageUrl?: string;
  /** Уникальный идентификатор офика (slug ссылки), совпадает с order description в Paygine. Только для type "tip". */
  linkSlug?: string;
  createdAt: string;
};

type OperationRow = OperationItem & { createdAtMs: number };

const compareOperationRows = (a: OperationRow, b: OperationRow) =>
  b.createdAtMs - a.createdAtMs || b.id.localeCompare(a.id);

const toTipRow = (
  t: {
    id: string;
    amountKop: bigint;
    feeKop: bigint | null;
    recipientCreditedKop: bigint | null;
    recipientFeeChargedKop: bigint | null;
    paymentMethod: string | null;
    payerInfo: string | null;
    status: string;
    createdAt: Date;
    link: { slug: string } | null;
  },
  baseUrl: string,
): OperationRow => ({
  id: t.id,
  type: "tip",
  amountKop: Number(t.recipientCreditedKop ?? t.amountKop),
  feeKop: Number(
    t.recipientFeeChargedKop ??
      (t.feeKop ?? BigInt(0)),
  ),
  status: t.status,
  ...(t.link && {
    linkSlug: t.link.slug,
    paymentPageUrl: baseUrl ? `${baseUrl}/pay/${t.link.slug}` : undefined,
  }),
  createdAt: t.createdAt.toISOString(),
  createdAtMs: t.createdAt.getTime(),
});

const toPayoutRow = (p: {
  id: string;
  amountKop: bigint;
  feeKop: bigint | null;
  status: string;
  rejectionReason: string | null;
  createdAt: Date;
}): OperationRow => {
  const amountKop = Number(p.amountKop);
  const feeStored = p.feeKop != null ? Number(p.feeKop) : feeKopForPayout(amountKop);
  return {
    id: p.id,
    type: "payout",
    amountKop,
    feeKop: feeStored,
    status: p.status,
    rejectionReason: p.rejectionReason ?? undefined,
    createdAt: p.createdAt.toISOString(),
    createdAtMs: p.createdAt.getTime(),
  };
};

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;
  void reconcileRecentTipsForUserIfDue(auth.userId);

  const { searchParams } = new URL(request.url);
  const { limit, offset } = parseLimitOffset(searchParams);
  const sinceRaw = searchParams.get("since")?.trim() ?? "";
  const sinceDate = sinceRaw ? new Date(sinceRaw) : null;
  const hasSince = !!sinceDate && !Number.isNaN(sinceDate.getTime());

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || getBaseUrlFromRequest(request) || "";
  const txWhere = {
    recipientId: auth.userId,
    status: "SUCCESS" as const,
    ...(hasSince && sinceDate ? { createdAt: { gt: sinceDate } } : {}),
  };
  const payoutWhere = {
    userId: auth.userId,
    ...(hasSince && sinceDate ? { createdAt: { gt: sinceDate } } : {}),
  };
  let txRows = 0;
  let payoutRows = 0;
  let total: number | null = null;
  let list: OperationItem[] = [];

  if (hasSince) {
    const [transactions, payouts] = await Promise.all([
      db.transaction.findMany({
        where: txWhere,
        select: {
          id: true,
          amountKop: true,
          feeKop: true,
          recipientCreditedKop: true,
          recipientFeeChargedKop: true,
          paymentMethod: true,
          payerInfo: true,
          status: true,
          createdAt: true,
          link: { select: { slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: 0,
      }),
      db.payoutRequest.findMany({
        where: payoutWhere,
        select: { id: true, amountKop: true, feeKop: true, status: true, rejectionReason: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: 0,
      }),
    ]);
    txRows = transactions.length;
    payoutRows = payouts.length;
    list = [...transactions.map((t) => toTipRow(t, baseUrl)), ...payouts.map((p) => toPayoutRow(p))]
      .sort(compareOperationRows)
      .slice(0, limit)
      .map(({ createdAtMs: _createdAtMs, ...item }) => item);
  } else {
    const [totalTx, totalPayout] = await Promise.all([
      db.transaction.count({ where: { recipientId: auth.userId, status: "SUCCESS" } }),
      db.payoutRequest.count({ where: { userId: auth.userId } }),
    ]);
    total = totalTx + totalPayout;

    const target = offset + limit;
    const batchSize = Math.min(200, Math.max(limit, 50));
    let txSkip = 0;
    let payoutSkip = 0;
    let txBuffer: OperationRow[] = [];
    let payoutBuffer: OperationRow[] = [];
    let txIndex = 0;
    let payoutIndex = 0;
    let txDone = false;
    let payoutDone = false;
    const selected: OperationRow[] = [];

    while (selected.length < target) {
      if (txIndex >= txBuffer.length && !txDone) {
        const txBatch = await db.transaction.findMany({
          where: txWhere,
          select: {
            id: true,
            amountKop: true,
            feeKop: true,
            recipientCreditedKop: true,
            recipientFeeChargedKop: true,
            paymentMethod: true,
            payerInfo: true,
            status: true,
            createdAt: true,
            link: { select: { slug: true } },
          },
          orderBy: { createdAt: "desc" },
          take: batchSize,
          skip: txSkip,
        });
        txRows += txBatch.length;
        txSkip += txBatch.length;
        txBuffer = txBatch.map((t) => toTipRow(t, baseUrl));
        txIndex = 0;
        if (txBatch.length < batchSize) txDone = true;
      }

      if (payoutIndex >= payoutBuffer.length && !payoutDone) {
        const payoutBatch = await db.payoutRequest.findMany({
          where: payoutWhere,
          select: { id: true, amountKop: true, feeKop: true, status: true, rejectionReason: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: batchSize,
          skip: payoutSkip,
        });
        payoutRows += payoutBatch.length;
        payoutSkip += payoutBatch.length;
        payoutBuffer = payoutBatch.map((p) => toPayoutRow(p));
        payoutIndex = 0;
        if (payoutBatch.length < batchSize) payoutDone = true;
      }

      const txCurrent = txBuffer[txIndex];
      const payoutCurrent = payoutBuffer[payoutIndex];
      if (!txCurrent && !payoutCurrent) break;

      if (!payoutCurrent || (txCurrent && compareOperationRows(txCurrent, payoutCurrent) <= 0)) {
        if (txCurrent) {
          selected.push(txCurrent);
          txIndex += 1;
        }
      } else {
        selected.push(payoutCurrent);
        payoutIndex += 1;
      }
    }

    list = selected
      .slice(offset, offset + limit)
      .map(({ createdAtMs: _createdAtMs, ...item }) => item);
  }

  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs >= 1200) {
    logInfo("operations.slow_request", {
      userId: auth.userId,
      mode: hasSince ? "incremental" : "full",
      limit,
      offset,
      elapsedMs,
      txRows,
      payoutRows,
      returned: list.length,
    });
  }

  return NextResponse.json({ operations: list, total });
}
