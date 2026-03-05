/**
 * POST /api/admin/payouts/sync-paygine-status
 * Синхронизация статусов заявок «В обработке» с Paygine (webapi/Order).
 * Обходит все PayoutRequest со статусом PROCESSING и externalId, запрашивает статус заказа в Paygine
 * и обновляет заявку на COMPLETED или REJECTED. Исправляет «зависшие» заявки после успешной оплаты в Paygine.
 * Требует: SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { getOrderStatus } from "@/lib/payment/paygine/client";
import { broadcastBalanceUpdated } from "@/lib/ws-broadcast";
import { requestPaygineBalance } from "@/lib/payment/request-paygine-balance";

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

  const processing = await db.payoutRequest.findMany({
    where: { status: "PROCESSING", externalId: { not: null } },
    select: { id: true, externalId: true, userId: true },
  });

  let completed = 0;
  let rejected = 0;
  const errors: string[] = [];

  for (const p of processing) {
    const orderId = p.externalId ? parseInt(p.externalId, 10) : NaN;
    if (!Number.isInteger(orderId)) {
      errors.push(`Payout ${p.id}: неверный externalId ${p.externalId}`);
      continue;
    }

    const result = await getOrderStatus({ sector, password }, orderId);
    if (!result.ok) {
      errors.push(`Payout ${p.id} (order ${orderId}): ${result.description ?? result.code ?? "ошибка"}`);
      continue;
    }

    const newStatus =
      result.orderState === "COMPLETED" ? "COMPLETED" : "REJECTED";
    await db.payoutRequest.update({
      where: { id: p.id },
      data: { status: newStatus },
    });
    if (newStatus === "COMPLETED") {
      completed++;
      void broadcastBalanceUpdated(p.userId);
    } else {
      rejected++;
    }
    void requestPaygineBalance(p.userId);
  }

  return NextResponse.json({
    total: processing.length,
    completed,
    rejected,
    errors: errors.slice(0, 20),
  });
}
