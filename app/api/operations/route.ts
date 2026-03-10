/**
 * GET /api/operations — единая история операций (пополнения + выводы).
 * Поддержка: Bearer (кабинет) и X-API-Key (приложение).
 * Query: limit (default 50), offset (default 0).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrApiKey } from "@/lib/auth-or-api-key";
import { db } from "@/lib/db";
import { parseLimitOffset } from "@/lib/api/helpers";
import { feeKopForPayout } from "@/lib/payment/paygine-fee";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";

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

export async function GET(request: NextRequest) {
  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const { limit, offset } = parseLimitOffset(searchParams);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || getBaseUrlFromRequest(request) || "";
  const takeEach = offset + limit;
  const [transactions, payouts, totalTx, totalPayout] = await Promise.all([
    db.transaction.findMany({
      where: { recipientId: auth.userId, status: "SUCCESS" },
      select: {
        id: true,
        amountKop: true,
        feeKop: true,
        status: true,
        createdAt: true,
        link: { select: { slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: takeEach,
      skip: 0,
    }),
    db.payoutRequest.findMany({
      where: { userId: auth.userId },
      select: { id: true, amountKop: true, feeKop: true, status: true, rejectionReason: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: takeEach,
      skip: 0,
    }),
    db.transaction.count({ where: { recipientId: auth.userId, status: "SUCCESS" } }),
    db.payoutRequest.count({ where: { userId: auth.userId } }),
  ]);

  const txItems: OperationItem[] = transactions.map((t) => ({
    id: t.id,
    type: "tip",
    amountKop: Number(t.amountKop),
    feeKop: Number(t.feeKop ?? 0),
    status: t.status,
    ...(t.link && {
      linkSlug: t.link.slug,
      paymentPageUrl: baseUrl ? `${baseUrl}/pay/${t.link.slug}` : undefined,
    }),
    createdAt: t.createdAt.toISOString(),
  }));

  const payoutItems: OperationItem[] = payouts.map((p) => {
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
    };
  });

  const merged = [...txItems, ...payoutItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const total = totalTx + totalPayout;
  const list = merged.slice(offset, offset + limit);

  return NextResponse.json({ operations: list, total });
}
