/**
 * GET /api/payouts/return?payoutId=...&success=0|1 — обработка возврата с Paygine после SDPayOutPage.
 * Обновляет статус заявки (COMPLETED/REJECTED) только для владельца и только если заявка в PROCESSING.
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

  const payout = await db.payoutRequest.findFirst({
    where: { id: payoutId, userId: auth.userId },
    select: { id: true, status: true, amountKop: true },
  });

  if (!payout) {
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

  if (newStatus === "COMPLETED") {
    void broadcastBalanceUpdated(auth.userId);
  }
  void requestPaygineBalance(auth.userId);

  return NextResponse.json({
    status: newStatus,
    amountKop: Number(payout.amountKop),
  });
}
