/**
 * GET /api/admin/stats
 * Сводка для админки: количество пользователей, транзакций, сумма транзакций, заявки на вывод.
 * Требует: Authorization: Bearer <access_token>, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { LK_PRESENCE_WINDOW_MS } from "@/lib/lk-presence";
import { PAYOUT_DAILY_LIMIT_COUNT, PAYOUT_DAILY_LIMIT_KOP } from "@/lib/payout-limits";
import { getRelocateStuckMonitoring } from "@/lib/payment/relocate-stuck-queries";
import { RELOCATE_CLAIM_STALE_MS, RELOCATE_CLAIM_ALERT_AFTER_MS } from "@/lib/payment/relocate-constants";
import { z } from "zod";

const periodSchema = z.enum(["all", "day", "week"]);

export async function GET(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period") ?? "all";
  const periodParse = periodSchema.safeParse(periodParam);
  if (!periodParse.success) {
    return NextResponse.json({ error: "Некорректный период" }, { status: 400 });
  }
  const period = periodParse.data;

  const now = new Date();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const dateFilter: { gte?: Date } =
    period === "day"
      ? { gte: new Date(now.getTime() - MS_PER_DAY) }
      : period === "week"
        ? { gte: new Date(now.getTime() - 7 * MS_PER_DAY) }
        : {};

  const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_PER_DAY);
  const lkFreshAfter = new Date(now.getTime() - LK_PRESENCE_WINDOW_MS);

  const [
    usersCount,
    usersActiveInLkCount,
    transactionsCount,
    transactionsSum,
    payoutsPendingCount,
    payoutsPendingSum,
    systemDefaultLimits,
    sampleMonthlyLimitsUser,
    sampleAutoConfirmUser,
    fraudUsers30d,
    relocateStuck,
  ] = await Promise.all([
    db.user.count({ where: { role: { not: "SUPERADMIN" } } }),
    db.user.count({
      where: {
        role: { not: "SUPERADMIN" },
        lastSeenAt: { gt: lkFreshAfter },
      },
    }),
    db.transaction.count({
      where: dateFilter.gte ? { createdAt: dateFilter } : undefined,
    }),
    db.transaction.aggregate({
      where: {
        status: "SUCCESS",
        ...(dateFilter.gte ? { createdAt: dateFilter } : {}),
      },
      _sum: { amountKop: true },
    }),
    db.payoutRequest.count({
      where: { status: "CREATED" },
    }),
    db.payoutRequest.aggregate({
      where: { status: "CREATED" },
      _sum: { amountKop: true },
    }),
    db.systemDefaultLimits.findUnique({ where: { id: "default" } }),
    db.user.findFirst({
      where: {
        role: { not: "SUPERADMIN" },
        OR: [
          { payoutMonthlyLimitCount: { not: null } },
          { payoutMonthlyLimitKop: { not: null } },
          { incomingMonthlyLimitKop: { not: null } },
        ],
      },
      orderBy: { id: "asc" },
      select: {
        payoutMonthlyLimitCount: true,
        payoutMonthlyLimitKop: true,
        incomingMonthlyLimitKop: true,
      },
    }),
    db.user.findFirst({
      where: { role: { not: "SUPERADMIN" } },
      orderBy: { id: "asc" },
      select: { autoConfirmPayouts: true, autoConfirmPayoutThresholdKop: true },
    }),
    db.fraudSignal.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
    getRelocateStuckMonitoring(),
  ]);

  const defaults = systemDefaultLimits;

  return NextResponse.json({
    usersCount,
    /** Сейчас в ЛК: lastSeenAt свежее окна LK_PRESENCE_WINDOW_MS (без SUPERADMIN) */
    usersActiveInLkCount,
    transactionsCount,
    transactionsSumKop: Number(transactionsSum._sum.amountKop ?? BigInt(0)),
    payoutsPendingCount,
    payoutsPendingSumKop: Number(payoutsPendingSum._sum.amountKop ?? BigInt(0)),
    period,
    /** Лимиты по умолчанию для новых аккаунтов (из антифрода; при отсутствии — константы) */
    defaultPayoutDailyLimitCount: defaults?.payoutDailyLimitCount ?? PAYOUT_DAILY_LIMIT_COUNT,
    defaultPayoutDailyLimitKop: defaults?.payoutDailyLimitKop != null ? Number(defaults.payoutDailyLimitKop) / 100 : Number(PAYOUT_DAILY_LIMIT_KOP) / 100,
    defaultPayoutMonthlyLimitCount: defaults?.payoutMonthlyLimitCount ?? sampleMonthlyLimitsUser?.payoutMonthlyLimitCount ?? null,
    defaultPayoutMonthlyLimitKop:
      defaults?.payoutMonthlyLimitKop != null
        ? Number(defaults.payoutMonthlyLimitKop) / 100
        : sampleMonthlyLimitsUser?.payoutMonthlyLimitKop != null
          ? Number(sampleMonthlyLimitsUser.payoutMonthlyLimitKop) / 100
          : null,
    defaultIncomingMonthlyLimitKop:
      defaults?.incomingMonthlyLimitKop != null
        ? Number(defaults.incomingMonthlyLimitKop) / 100
        : sampleMonthlyLimitsUser?.incomingMonthlyLimitKop != null
          ? Number(sampleMonthlyLimitsUser.incomingMonthlyLimitKop) / 100
          : null,
    defaultAutoConfirmEnabled: defaults?.autoConfirmPayouts ?? sampleAutoConfirmUser?.autoConfirmPayouts ?? false,
    defaultAutoConfirmThresholdKop:
      defaults?.autoConfirmPayoutThresholdKop != null
        ? Number(defaults.autoConfirmPayoutThresholdKop)
        : sampleAutoConfirmUser?.autoConfirmPayoutThresholdKop != null
          ? Number(sampleAutoConfirmUser.autoConfirmPayoutThresholdKop)
          : null,
    /** Уникальные пользователи со сигналом антифрода за 30 дней (наблюдение) */
    fraudFlaggedUsers30d: fraudUsers30d.length,
    paymentRelocateStuckClaimCount: relocateStuck.stuckCount,
    paymentRelocateStuckClaimSample: relocateStuck.sampleJson,
    paymentRelocateStaleClaimResetMs: RELOCATE_CLAIM_STALE_MS,
    paymentRelocateAlertAfterClaimMs: RELOCATE_CLAIM_ALERT_AFTER_MS,
  });
}
