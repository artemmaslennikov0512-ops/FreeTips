/**
 * POST /api/admin/sync-transaction-statuses
 * Синхронизация статусов пополнений (Transaction) с Paygine (webapi/Order).
 * Для каждой транзакции с externalId и статусом SUCCESS или PENDING запрашивает статус заказа в Paygine;
 * если заказ не COMPLETED — обновляет статус транзакции на FAILED (исправление сбоев).
 * Запускайте периодически (cron) вместе с sync-paygine-status для выводов.
 * Требует: SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { getOrderStatus } from "@/lib/payment/paygine/client";
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
  const errors: string[] = [];

  for (const tx of transactions) {
    const orderId = tx.externalId ? parseInt(tx.externalId, 10) : NaN;
    if (!Number.isInteger(orderId)) {
      errors.push(`Transaction ${tx.id}: неверный externalId ${tx.externalId}`);
      continue;
    }

    const result = await getOrderStatus({ sector, password }, orderId);
    if (!result.ok) {
      errors.push(`Transaction ${tx.id} (order ${orderId}): ${result.description ?? result.code ?? "ошибка"}`);
      continue;
    }

    if (result.orderState !== "COMPLETED") {
      await db.transaction.update({
        where: { id: tx.id },
        data: { status: TransactionStatus.FAILED },
      });
      corrected++;
    }
  }

  return NextResponse.json({
    total: transactions.length,
    corrected,
    errors: errors.slice(0, 20),
  });
}
