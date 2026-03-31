/**
 * GET /api/pay/transaction-status?tid=...
 * Статус транзакции для экрана после оплаты (без авторизации). Только { status }.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const TID_RE = /^[a-z0-9]{20,40}$/i;

export async function GET(request: NextRequest) {
  const tid = new URL(request.url).searchParams.get("tid")?.trim() ?? "";
  if (!tid || !TID_RE.test(tid)) {
    return NextResponse.json({ error: "Неверный идентификатор" }, { status: 400 });
  }

  const tx = await db.transaction.findUnique({
    where: { id: tid },
    select: { status: true },
  });

  if (!tx) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  return NextResponse.json(
    { status: tx.status },
    { headers: { "Cache-Control": "no-store" } },
  );
}
