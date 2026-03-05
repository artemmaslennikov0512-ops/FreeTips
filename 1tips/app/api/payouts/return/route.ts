/**
 * GET /api/payouts/return?payoutId=...&success=0|1 — обработка возврата с Paygine после SDPayOutPage.
 * Обновляет статус заявки (COMPLETED/REJECTED). Владелец заявки или SUPERADMIN (например после вывода из профиля официанта).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrApiKey } from "@/lib/auth-or-api-key";
import { db } from "@/lib/db";
import { broadcastBalanceUpdated } from "@/lib/ws-broadcast";
import { requestPaygineBalance } from "@/lib/payment/request-paygine-balance";

export async function GET(request: NextRequest) {
  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const payoutId = searchParams.get("payoutId");
  const success = searchParams.get("success");

  if (!payoutId || (success !== "0" && success !== "1")) {
    return NextResponse.json(
      { error: "Неверные параметры возврата" },
      { status: 400 },
    );
  }

  const payout = await db.payoutRequest.findUnique({
    where: { id: payoutId },
    select: { id: true, userId: true, status: true, amountKop: true },
  });

  if (!payout) {
    return NextResponse.json(
      { error: "Заявка не найдена", status: null },
      { status: 404 },
    );
  }

  const isOwner = payout.userId === auth.userId;
  const isSuperadmin = auth.role === "SUPERADMIN";
  if (!isOwner && !isSuperadmin) {
    return NextResponse.json(
      { error: "Заявка не найдена", status: null },
      { status: 404 },
    );
  }

  if (payout.status !== "PROCESSING") {
    return NextResponse.json({
      status: payout.status,
      amountKop: Number(payout.amountKop),
      alreadyProcessed: true,
    });
  }

  const newStatus = success === "1" ? "COMPLETED" : "REJECTED";
  await db.payoutRequest.update({
    where: { id: payout.id },
    data: { status: newStatus },
  });

  const recipientUserId = payout.userId;
  if (newStatus === "COMPLETED") {
    void broadcastBalanceUpdated(recipientUserId);
  }
  void requestPaygineBalance(recipientUserId);

  return NextResponse.json({
    status: newStatus,
    amountKop: Number(payout.amountKop),
  });
}
