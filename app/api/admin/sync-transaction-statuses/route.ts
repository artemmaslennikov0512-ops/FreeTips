/**
 * POST /api/admin/sync-transaction-statuses
 * Синхронизация статусов пополнений (Transaction) с Paygine (webapi/Order).
 * Для каждой транзакции с externalId и статусом SUCCESS или PENDING запрашивает статус заказа в Paygine:
 * - PENDING в БД и COMPLETED в Paygine — запускает перелив и ставит SUCCESS (восстановление при потерянном вебхуке);
 * - заказ не COMPLETED в Paygine — ставит транзакции FAILED.
 * Запускайте периодически (cron) вместе с sync-paygine-status для выводов.
 * Требует: SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { syncTipTransactionFromPaygine } from "@/lib/payment/sync-tip-from-paygine";
import { TransactionStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD?.trim();
  if (!sector || !password) {
    return NextResponse.json(
      { error: "Paygine не настроен (PAYGINE_SECTOR, PAYGINE_PASSWORD)" },
      { status: 503 },
    );
  }

  const transactions = await db.transaction.findMany({
    where: {
      externalId: { not: null },
      status: { in: [TransactionStatus.SUCCESS, TransactionStatus.PENDING] },
    },
    select: { id: true, externalId: true, status: true },
  });

  let corrected = 0;
  let recovered = 0;
  const errors: string[] = [];

  for (const tx of transactions) {
    const r = await syncTipTransactionFromPaygine(tx.id, { failIfPaygineNotCompleted: true });
    if (!r.ok && r.error) {
      errors.push(`Transaction ${tx.id}: ${r.error}`);
      continue;
    }
    if (r.recovered) recovered++;
    if (r.markedFailed) corrected++;
  }

  return NextResponse.json({
    total: transactions.length,
    corrected,
    recovered,
    errors: errors.slice(0, 20),
  });
}
