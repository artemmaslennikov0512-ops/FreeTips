/**
 * GET /api/transactions — история чаевых текущего пользователя (получателя).
 * Query: limit (default 20), offset (default 0), status? (SUCCESS|PENDING|FAILED|CANCELLED)
 * Требует: Authorization: Bearer <access_token>
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrApiKey } from "@/lib/auth-or-api-key";
import { db } from "@/lib/db";
import { parseLimitOffset } from "@/lib/api/helpers";

const STATUSES = ["SUCCESS", "PENDING", "FAILED", "CANCELLED"] as const;

export async function GET(request: NextRequest) {
  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const { limit, offset } = parseLimitOffset(searchParams);
  const status = searchParams.get("status") ?? undefined;
  if (status && !STATUSES.includes(status as (typeof STATUSES)[number])) {
    return NextResponse.json({ error: "Неверный статус" }, { status: 400 });
  }

  const where = {
    recipientId: auth.userId,
    ...(status && { status: status as "SUCCESS" | "PENDING" | "FAILED" | "CANCELLED" }),
  };

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      select: { id: true, amountKop: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.transaction.count({ where }),
  ]);

  const list = transactions.map((t) => ({
    id: t.id,
    amountKop: Number(t.amountKop),
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  }));

  return NextResponse.json({ transactions: list, total });
}
