/**
 * GET /api/admin/users — список пользователей (поиск по login/email).
 * Требует: Authorization: Bearer <access_token>
 * GET: роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { parseLimitOffset } from "@/lib/api/helpers";

const SEARCH_MAX_LENGTH = 100;

export async function GET(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const { limit, offset } = parseLimitOffset(searchParams, {
    defaultLimit: 50,
    maxLimit: 100,
  });
  const rawSearch = searchParams.get("search");
  const search = rawSearch?.trim() ?? "";
  if (search.length > SEARCH_MAX_LENGTH) {
    return NextResponse.json(
      { error: "Слишком длинный поисковый запрос" },
      { status: 400 },
    );
  }

  const roleFilter = searchParams.get("role");
  const blockedFilter = searchParams.get("blocked");
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const validRoles = ["RECIPIENT", "ADMIN"] as const;
  const baseWhere: Record<string, unknown> = { role: { not: UserRole.SUPERADMIN } };

  if (roleFilter && validRoles.includes(roleFilter as (typeof validRoles)[number])) {
    baseWhere.role = roleFilter as UserRole;
  }
  if (blockedFilter === "true") {
    baseWhere.isBlocked = true;
  } else if (blockedFilter === "false") {
    baseWhere.isBlocked = false;
  }

  const where = search
    ? {
        ...baseWhere,
        OR: [
          { login: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : baseWhere;

  const [users, total, txAgg, payoutPendingAgg, payoutCompletedAgg] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        uniqueId: true,
        login: true,
        email: true,
        role: true,
        createdAt: true,
        isBlocked: true,
      },
      orderBy: { [sortBy === "login" ? "login" : "createdAt"]: sortOrder },
      take: limit,
      skip: offset,
    }),
    db.user.count({ where }),
    db.transaction.groupBy({
      by: ["recipientId"],
      where: { status: "SUCCESS" },
      _sum: { amountKop: true, feeKop: true },
      _count: { _all: true },
    }),
    db.payoutRequest.groupBy({
      by: ["userId"],
      where: { status: { in: ["CREATED", "PROCESSING"] } },
      _count: { _all: true },
    }),
    db.payoutRequest.groupBy({
      by: ["userId"],
      where: { status: "COMPLETED" },
      _sum: { amountKop: true, feeKop: true },
    }),
  ]);

  const txMap = new Map(
    txAgg.map((t) => {
      const amount = t._sum.amountKop ?? BigInt(0);
      const fee = t._sum.feeKop ?? BigInt(0);
      return [t.recipientId, { receivedKop: amount - fee, count: t._count._all }];
    }),
  );
  const pendingMap = new Map(payoutPendingAgg.map((p) => [p.userId, p._count._all]));
  const completedMap = new Map(
    payoutCompletedAgg.map((p) => {
      const amount = p._sum.amountKop ?? BigInt(0);
      const fee = p._sum.feeKop ?? BigInt(0);
      return [p.userId, amount + fee];
    }),
  );

  return NextResponse.json({
    users: users.map((u) => {
      const tx = txMap.get(u.id) ?? { receivedKop: BigInt(0), count: 0 };
      const pendingCount = pendingMap.get(u.id) ?? 0;
      const withdrawn = completedMap.get(u.id) ?? BigInt(0);
      const balance = tx.receivedKop - withdrawn;
      return {
        id: u.id,
        uniqueId: u.uniqueId,
        login: u.login,
        email: u.email,
        role: u.role,
        isBlocked: u.isBlocked,
        createdAt: u.createdAt.toISOString(),
        stats: {
          balanceKop: Number(balance),
          totalReceivedKop: Number(tx.receivedKop),
          transactionsCount: tx.count,
          payoutsPendingCount: pendingCount,
        },
      };
    }),
    total,
    limit,
    offset,
  });
}
