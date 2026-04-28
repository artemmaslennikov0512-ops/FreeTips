/**
 * GET /api/admin/users — список пользователей (поиск по login/email/коду в /pay).
 * Query: lkActive=true|false — фильтр по присутствию в ЛК (lastSeenAt за окно LK_PRESENCE_WINDOW_MS).
 * Требует: Authorization: Bearer <access_token>
 * GET: роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { parseLimitOffset } from "@/lib/api/helpers";
import { isActiveInLk, LK_PRESENCE_WINDOW_MS } from "@/lib/lk-presence";

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
  const lkActiveFilter = searchParams.get("lkActive");
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const statsSort = sortBy === "balance" || sortBy === "received" || sortBy === "transactions";

  const now = new Date();
  const lkFreshAfter = new Date(now.getTime() - LK_PRESENCE_WINDOW_MS);
  const validRoles = ["RECIPIENT", "ADMIN", "ESTABLISHMENT_ADMIN", "EMPLOYEE"] as const;
  const baseWhere: Record<string, unknown> = { role: { not: UserRole.SUPERADMIN } };

  if (roleFilter && validRoles.includes(roleFilter as (typeof validRoles)[number])) {
    baseWhere.role = roleFilter as UserRole;
  }
  if (blockedFilter === "true") {
    baseWhere.isBlocked = true;
  } else if (blockedFilter === "false") {
    baseWhere.isBlocked = false;
  }
  if (lkActiveFilter === "true") {
    baseWhere.lastSeenAt = { gt: lkFreshAfter };
  }

  const searchOr = [
    { login: { contains: search, mode: "insensitive" as const } },
    { email: { contains: search, mode: "insensitive" as const } },
    {
      tipLinks: {
        some: { slug: { contains: search, mode: "insensitive" as const } },
      },
    },
    {
      employeeProfile: {
        qrCodeIdentifier: { contains: search, mode: "insensitive" as const },
      },
    },
    {
      establishmentRelation: {
        uniqueSlug: { contains: search, mode: "insensitive" as const },
      },
    },
  ];

  const lkAbsentClause = {
    OR: [{ lastSeenAt: null }, { lastSeenAt: { lte: lkFreshAfter } }],
  };

  let where: Record<string, unknown>;
  if (search) {
    if (lkActiveFilter === "false") {
      where = { ...baseWhere, AND: [{ OR: searchOr }, lkAbsentClause] };
    } else {
      where = { ...baseWhere, OR: searchOr };
    }
  } else if (lkActiveFilter === "false") {
    where = { ...baseWhere, ...lkAbsentClause };
  } else {
    where = baseWhere;
  }

  const [allCandidates, total] = await Promise.all([
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
        lastSeenAt: true,
        tipLinks: {
          select: { slug: true },
          orderBy: { createdAt: "asc" },
        },
      },
      ...(statsSort ? {} : { orderBy: { [sortBy === "login" ? "login" : "createdAt"]: sortOrder }, take: limit, skip: offset }),
    }),
    db.user.count({ where }),
  ]);

  const userIds = allCandidates.map((u) => u.id);
  const [txAgg, payoutPendingAgg, payoutCompletedAgg] = await Promise.all([
    db.transaction.groupBy({
      by: ["recipientId"],
      where: { status: "SUCCESS", recipientId: { in: userIds } },
      _sum: { amountKop: true, feeKop: true },
      _count: { _all: true },
    }),
    db.payoutRequest.groupBy({
      by: ["userId"],
      where: { status: { in: ["CREATED", "PROCESSING"] }, userId: { in: userIds } },
      _count: { _all: true },
    }),
    db.payoutRequest.groupBy({
      by: ["userId"],
      where: { status: "COMPLETED", userId: { in: userIds } },
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

  const usersWithStats = allCandidates.map((u) => {
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
        tipSlugs: u.tipLinks.map((t) => t.slug),
        lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
        activeInLk: isActiveInLk(u.lastSeenAt, now),
        stats: {
          balanceKop: Number(balance),
          totalReceivedKop: Number(tx.receivedKop),
          transactionsCount: tx.count,
          payoutsPendingCount: pendingCount,
        },
      };
    });

  const users = statsSort
    ? [...usersWithStats]
        .sort((a, b) => {
          const av =
            sortBy === "balance" ? a.stats.balanceKop : sortBy === "received" ? a.stats.totalReceivedKop : a.stats.transactionsCount;
          const bv =
            sortBy === "balance" ? b.stats.balanceKop : sortBy === "received" ? b.stats.totalReceivedKop : b.stats.transactionsCount;
          if (av === bv) return b.createdAt.localeCompare(a.createdAt);
          return sortOrder === "asc" ? av - bv : bv - av;
        })
        .slice(offset, offset + limit)
    : usersWithStats;

  return NextResponse.json({
    users,
    total,
    limit,
    offset,
  });
}
