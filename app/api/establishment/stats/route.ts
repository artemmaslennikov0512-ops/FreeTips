/**
 * GET /api/establishment/stats — статистика чаевых по заведению.
 * Требует: ESTABLISHMENT_ADMIN
 * Query: period=7d | 30d (по умолчанию 7d)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { TransactionStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const period = request.nextUrl.searchParams.get("period") || "7d";
  const days = period === "30d" ? 30 : 7;

  const employeeIds = await db.employee
    .findMany({
      where: { establishmentId: auth.establishmentId },
      select: { id: true },
    })
    .then((r) => r.map((e) => e.id));

  if (employeeIds.length === 0) {
    return NextResponse.json({
      totalTipsKop: 0,
      transactionsCount: 0,
      byDay: [],
      employeesCount: 0,
    });
  }

  const linkIds = await db.tipLink
    .findMany({
      where: { employeeId: { in: employeeIds } },
      select: { id: true },
    })
    .then((r) => r.map((l) => l.id));

  if (linkIds.length === 0) {
    return NextResponse.json({
      totalTipsKop: 0,
      transactionsCount: 0,
      byDay: [],
      employeesCount: employeeIds.length,
    });
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);

  const [aggregate, transactions] = await Promise.all([
    db.transaction.aggregate({
      where: {
        linkId: { in: linkIds },
        status: TransactionStatus.SUCCESS,
        createdAt: { gte: since },
      },
      _sum: { amountKop: true },
      _count: true,
    }),
    db.transaction.findMany({
      where: {
        linkId: { in: linkIds },
        status: TransactionStatus.SUCCESS,
        createdAt: { gte: since },
      },
      select: { amountKop: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const totalTipsKop = Number(aggregate._sum.amountKop ?? 0);
  const transactionsCount = aggregate._count;

  const byDayMap = new Map<string, number>();
  for (const t of transactions) {
    const key = t.createdAt.toISOString().slice(0, 10);
    byDayMap.set(key, (byDayMap.get(key) ?? 0) + Number(t.amountKop));
  }
  const byDay = Array.from(byDayMap.entries())
    .map(([date, amountKop]) => ({ date, amountKop }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    totalTipsKop,
    transactionsCount,
    byDay,
    employeesCount: employeeIds.length,
  });
}
