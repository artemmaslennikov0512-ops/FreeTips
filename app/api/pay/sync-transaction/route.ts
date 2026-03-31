/**
 * POST /api/pay/sync-transaction
 * Тело: { "tid": "<id транзакции>" }
 * Опрос Paygine Order + при необходимости перелив (как отложенный вебхук).
 * Без авторизации: tid сложно угадать; нужен гостю после редиректа с оплаты.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { syncTipTransactionFromPaygine } from "@/lib/payment/sync-tip-from-paygine";
import { logInfo } from "@/lib/logger";
import { getClientIP } from "@/lib/middleware/rate-limit";

const bodySchema = z.object({
  tid: z.string().min(20).max(40).regex(/^[a-z0-9]+$/i),
});

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверный идентификатор" }, { status: 400 });
  }

  const tid = parsed.data.tid;
  logInfo("payment.sync_transaction.request", { transactionId: tid, ip: getClientIP(request) });

  const r = await syncTipTransactionFromPaygine(tid);
  logInfo("payment.sync_transaction.result", {
    transactionId: tid,
    synced: r.ok,
    dbStatus: r.status,
    paygineOrderState: r.paygineOrderState ?? null,
    recovered: r.recovered ?? false,
    paygineErrorCode: r.paygineErrorCode ?? null,
    error: r.error ?? null,
  });

  if (!r.ok && r.error === "Транзакция не найдена") {
    return NextResponse.json({ error: r.error }, { status: 404 });
  }

  return NextResponse.json(
    {
      status: r.status,
      synced: r.ok,
      paygineOrderState: r.paygineOrderState ?? null,
      paygineErrorCode: r.paygineErrorCode ?? null,
      error: r.error ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
