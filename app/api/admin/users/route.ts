/**
 * GET /api/admin/users — список пользователей (поиск по login/email/коду в /pay).
 * Query: lkActive=true|false — фильтр по присутствию в ЛК (lastSeenAt за окно LK_PRESENCE_WINDOW_MS).
 * Требует: Authorization: Bearer <access_token>
 * GET: роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { Prisma, UserRole } from "@prisma/client";
import { parseLimitOffset } from "@/lib/api/helpers";
import { isActiveInLk, LK_PRESENCE_WINDOW_MS } from "@/lib/lk-presence";

const SEARCH_MAX_LENGTH = 100;
type StatsUserRow = {
  id: string;
  unique_id: number;
  login: string;
  email: string | null;
  role: UserRole;
  is_blocked: boolean;
  created_at: Date;
  last_seen_at: Date | null;
  tip_slugs: string[] | null;
  balance_kop: bigint | string | number;
  total_received_kop: bigint | string | number;
  transactions_count: bigint | string | number;
  payouts_pending_count: bigint | string | number;
};

const toNumberSafe = (value: bigint | string | number | null | undefined): number => {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value);
};

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

  const total = await db.user.count({ where });

  if (statsSort) {
    const statsSortColumn =
      sortBy === "balance"
        ? `"balance_kop"`
        : sortBy === "received"
          ? `"total_received_kop"`
          : `"transactions_count"`;
    const statsSortDirection = sortOrder === "asc" ? "ASC" : "DESC";
    const sqlConditions: Prisma.Sql[] = [Prisma.sql`u.role <> ${UserRole.SUPERADMIN}`];
    if (roleFilter && validRoles.includes(roleFilter as (typeof validRoles)[number])) {
      sqlConditions.push(Prisma.sql`u.role = ${roleFilter as UserRole}`);
    }
    if (blockedFilter === "true") {
      sqlConditions.push(Prisma.sql`u."isBlocked" = true`);
    } else if (blockedFilter === "false") {
      sqlConditions.push(Prisma.sql`u."isBlocked" = false`);
    }
    if (lkActiveFilter === "true") {
      sqlConditions.push(Prisma.sql`u."lastSeenAt" > ${lkFreshAfter}`);
    } else if (lkActiveFilter === "false") {
      sqlConditions.push(Prisma.sql`(u."lastSeenAt" IS NULL OR u."lastSeenAt" <= ${lkFreshAfter})`);
    }
    if (search) {
      const searchPattern = `%${search}%`;
      sqlConditions.push(Prisma.sql`(
          u.login ILIKE ${searchPattern}
          OR COALESCE(u.email, '') ILIKE ${searchPattern}
          OR EXISTS (
            SELECT 1
            FROM tip_links tl
            WHERE tl."userId" = u.id
              AND tl.slug ILIKE ${searchPattern}
          )
          OR EXISTS (
            SELECT 1
            FROM employees e
            WHERE e."userId" = u.id
              AND e."qrCodeIdentifier" ILIKE ${searchPattern}
          )
          OR EXISTS (
            SELECT 1
            FROM establishments est
            WHERE est.id = u."establishmentId"
              AND est."uniqueSlug" ILIKE ${searchPattern}
          )
        )`);
    }

    const statsRows = await db.$queryRaw<StatsUserRow[]>(Prisma.sql`
      WITH filtered_users AS (
        SELECT
          u.id,
          u."uniqueId" AS unique_id,
          u.login,
          u.email,
          u.role,
          u."isBlocked" AS is_blocked,
          u."createdAt" AS created_at,
          u."lastSeenAt" AS last_seen_at
        FROM users u
        WHERE ${Prisma.join(sqlConditions, " AND ")}
      ),
      tx AS (
        SELECT
          t."recipientId" AS user_id,
          COALESCE(SUM(t."amountKop" - COALESCE(t."feeKop", 0)), 0)::bigint AS total_received_kop,
          COUNT(*)::bigint AS transactions_count
        FROM transactions t
        INNER JOIN filtered_users fu ON fu.id = t."recipientId"
        WHERE t.status = 'SUCCESS'
        GROUP BY t."recipientId"
      ),
      pending AS (
        SELECT
          p."userId" AS user_id,
          COUNT(*)::bigint AS payouts_pending_count
        FROM payout_requests p
        INNER JOIN filtered_users fu ON fu.id = p."userId"
        WHERE p.status IN ('CREATED', 'PROCESSING')
        GROUP BY p."userId"
      ),
      completed AS (
        SELECT
          p."userId" AS user_id,
          COALESCE(SUM(p."amountKop" + COALESCE(p."feeKop", 0)), 0)::bigint AS withdrawn_kop
        FROM payout_requests p
        INNER JOIN filtered_users fu ON fu.id = p."userId"
        WHERE p.status = 'COMPLETED'
        GROUP BY p."userId"
      )
      SELECT
        fu.id,
        fu.unique_id,
        fu.login,
        fu.email,
        fu.role,
        fu.is_blocked,
        fu.created_at,
        fu.last_seen_at,
        COALESCE(tl.tip_slugs, ARRAY[]::text[]) AS tip_slugs,
        (COALESCE(tx.total_received_kop, 0) - COALESCE(completed.withdrawn_kop, 0)) AS balance_kop,
        COALESCE(tx.total_received_kop, 0) AS total_received_kop,
        COALESCE(tx.transactions_count, 0) AS transactions_count,
        COALESCE(pending.payouts_pending_count, 0) AS payouts_pending_count
      FROM filtered_users fu
      LEFT JOIN tx ON tx.user_id = fu.id
      LEFT JOIN pending ON pending.user_id = fu.id
      LEFT JOIN completed ON completed.user_id = fu.id
      LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(tl.slug ORDER BY tl."createdAt" ASC) AS tip_slugs
        FROM tip_links tl
        WHERE tl."userId" = fu.id
      ) tl ON TRUE
      ORDER BY ${Prisma.raw(statsSortColumn)} ${Prisma.raw(statsSortDirection)}, fu.created_at DESC, fu.unique_id ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const users = statsRows.map((row) => ({
      id: row.id,
      uniqueId: row.unique_id,
      login: row.login,
      email: row.email,
      role: row.role,
      isBlocked: row.is_blocked,
      createdAt: row.created_at.toISOString(),
      tipSlugs: row.tip_slugs ?? [],
      lastSeenAt: row.last_seen_at?.toISOString() ?? null,
      activeInLk: isActiveInLk(row.last_seen_at, now),
      stats: {
        balanceKop: toNumberSafe(row.balance_kop),
        totalReceivedKop: toNumberSafe(row.total_received_kop),
        transactionsCount: toNumberSafe(row.transactions_count),
        payoutsPendingCount: toNumberSafe(row.payouts_pending_count),
      },
    }));

    return NextResponse.json({
      users,
      total,
      limit,
      offset,
    });
  }

  const baseUsersOrderBy: Prisma.UserOrderByWithRelationInput[] =
    sortBy === "login"
      ? [{ login: sortOrder }, { createdAt: "desc" }, { uniqueId: "asc" }]
      : [{ createdAt: sortOrder }, { uniqueId: "asc" }];

  const baseUsers = await db.user.findMany({
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
    orderBy: baseUsersOrderBy,
    take: limit,
    skip: offset,
  });

  const pageIds = baseUsers.map((u) => u.id);
  const [txAgg, payoutPendingAgg, payoutCompletedAgg] =
    pageIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          db.transaction.groupBy({
            by: ["recipientId"],
            where: { status: "SUCCESS", recipientId: { in: pageIds } },
            _sum: { amountKop: true, feeKop: true },
            _count: { _all: true },
          }),
          db.payoutRequest.groupBy({
            by: ["userId"],
            where: {
              status: { in: ["CREATED", "PROCESSING"] },
              userId: { in: pageIds },
            },
            _count: { _all: true },
          }),
          db.payoutRequest.groupBy({
            by: ["userId"],
            where: { status: "COMPLETED", userId: { in: pageIds } },
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

  const statsByUserId = new Map(
    pageIds.map((id) => {
      const tx = txMap.get(id) ?? { receivedKop: BigInt(0), count: 0 };
      const pendingCount = pendingMap.get(id) ?? 0;
      const withdrawn = completedMap.get(id) ?? BigInt(0);
      const balance = tx.receivedKop - withdrawn;
      return [
        id,
        {
          balanceKop: Number(balance),
          totalReceivedKop: Number(tx.receivedKop),
          transactionsCount: tx.count,
          payoutsPendingCount: pendingCount,
        },
      ];
    }),
  );

  const users = baseUsers.map((u) => {
    const stats = statsByUserId.get(u.id) ?? {
      balanceKop: 0,
      totalReceivedKop: 0,
      transactionsCount: 0,
      payoutsPendingCount: 0,
    };
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
      stats,
    };
  });

  return NextResponse.json({
    users,
    total,
    limit,
    offset,
  });
}
