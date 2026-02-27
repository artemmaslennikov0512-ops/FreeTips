/**
 * GET /api/admin/users/[id] — профиль, статистика, история пополнений.
 * PATCH /api/admin/users/[id] — блокировка/разблокировка.
 * Требует: Authorization: Bearer <access_token>, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";

const updateUserSchema = z.object({
  isBlocked: z.boolean().optional(),
  payoutDailyLimitCount: z.number().int().min(0).max(100).nullable().optional(),
  payoutDailyLimitKop: z.number().int().min(0).nullable().optional(),
  payoutMonthlyLimitCount: z.number().int().min(0).max(3000).nullable().optional(),
  payoutMonthlyLimitKop: z.number().int().min(0).nullable().optional(),
  autoConfirmPayouts: z.boolean().optional(),
  autoConfirmPayoutThresholdKop: z.number().int().min(0).nullable().optional(),
});

const STATUS_VALUES = ["PENDING", "SUCCESS", "FAILED", "CANCELLED"] as const;
const statusSchema = z.enum(STATUS_VALUES);
const LIMIT_MAX = 100;
const LIMIT_DEFAULT = 50;
const USER_SELECT = {
  id: true,
  uniqueId: true,
  login: true,
  email: true,
  role: true,
  isBlocked: true,
  apiKey: true,
  apiKeyHash: true,
  payoutDailyLimitCount: true,
  payoutDailyLimitKop: true,
  payoutMonthlyLimitCount: true,
  payoutMonthlyLimitKop: true,
  autoConfirmPayouts: true,
  autoConfirmPayoutThresholdKop: true,
  createdAt: true,
  fullName: true,
  birthDate: true,
  establishment: true,
};

type ListParams = {
  limit: number;
  offset: number;
  status: (typeof STATUS_VALUES)[number];
};

function parseNonNegativeInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseListParams(request: NextRequest): ListParams | NextResponse {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    parseNonNegativeInt(searchParams.get("limit"), LIMIT_DEFAULT),
    LIMIT_MAX,
  );
  const offset = parseNonNegativeInt(searchParams.get("offset"), 0);
  const statusParam = searchParams.get("status");
  if (!statusParam) return { limit, offset, status: "SUCCESS" };
  const parsed = statusSchema.safeParse(statusParam);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
  }
  return { limit, offset, status: parsed.data };
}

function serializeUser(user: {
  id: string;
  login: string;
  email: string | null;
  role: string;
  isBlocked: boolean;
  apiKey: string | null;
  apiKeyHash: string | null;
  payoutDailyLimitCount: number | null;
  payoutDailyLimitKop: bigint | null;
  payoutMonthlyLimitCount: number | null;
  payoutMonthlyLimitKop: bigint | null;
  autoConfirmPayouts: boolean;
  autoConfirmPayoutThresholdKop: bigint | null;
  createdAt: Date;
  fullName: string | null;
  birthDate: string | null;
  establishment: string | null;
}) {
  return {
    id: user.id,
    login: user.login,
    email: user.email,
    role: user.role,
    isBlocked: user.isBlocked,
    hasApiKey: !!(user.apiKey ?? user.apiKeyHash),
    payoutDailyLimitCount: user.payoutDailyLimitCount,
    payoutDailyLimitKop: user.payoutDailyLimitKop != null ? Number(user.payoutDailyLimitKop) : null,
    payoutMonthlyLimitCount: user.payoutMonthlyLimitCount,
    payoutMonthlyLimitKop: user.payoutMonthlyLimitKop != null ? Number(user.payoutMonthlyLimitKop) : null,
    autoConfirmPayouts: user.autoConfirmPayouts,
    autoConfirmPayoutThresholdKop: user.autoConfirmPayoutThresholdKop != null ? Number(user.autoConfirmPayoutThresholdKop) : null,
    createdAt: user.createdAt.toISOString(),
    fullName: user.fullName,
    birthDate: user.birthDate,
    establishment: user.establishment,
  };
}

function serializeTransaction(tx: { id: string; amountKop: bigint; status: string; createdAt: Date }) {
  return {
    id: tx.id,
    amountKop: Number(tx.amountKop),
    status: tx.status,
    createdAt: tx.createdAt.toISOString(),
  };
}

function getUser(id: string) {
  return db.user.findUnique({ where: { id }, select: USER_SELECT });
}

function getTransactionSum(id: string) {
  return db.transaction.aggregate({
    where: { recipientId: id, status: "SUCCESS" },
    _sum: { amountKop: true },
  });
}

function getCompletedPayoutSum(id: string) {
  return db.payoutRequest.aggregate({
    where: { userId: id, status: "COMPLETED" },
    _sum: { amountKop: true },
  });
}

function getTransactionCount(id: string) {
  return db.transaction.count({ where: { recipientId: id, status: "SUCCESS" } });
}

function getPayoutPendingCount(id: string) {
  return db.payoutRequest.count({
    where: { userId: id, status: { in: ["CREATED", "PROCESSING"] } },
  });
}

function getTransactions(id: string, params: ListParams) {
  return db.transaction.findMany({
    where: { recipientId: id, status: params.status },
    orderBy: { createdAt: "desc" },
    take: params.limit,
    skip: params.offset,
  });
}

async function fetchUserDetails(id: string, params: ListParams) {
  const [user, txSum, payoutsCompletedSum, txCount, payoutsPendingCount, transactions] =
    await Promise.all([
      getUser(id),
      getTransactionSum(id),
      getCompletedPayoutSum(id),
      getTransactionCount(id),
      getPayoutPendingCount(id),
      getTransactions(id, params),
    ]);
  return { user, txSum, payoutsCompletedSum, txCount, payoutsPendingCount, transactions };
}

function buildStats(txSum: bigint, payoutsCompleted: bigint, txCount: number, pendingCount: number) {
  const balance = txSum - payoutsCompleted;
  return {
    balanceKop: Number(balance),
    totalReceivedKop: Number(txSum),
    transactionsCount: txCount,
    payoutsPendingCount: pendingCount,
  };
}

async function handleGet(
  request: NextRequest,
  params: Promise<{ id: string }>,
): Promise<NextResponse> {
  const parsed = parseListParams(request);
  if (parsed instanceof NextResponse) return parsed;
  const { id } = await params;
  const data = await fetchUserDetails(id, parsed);
  if (!data.user || data.user.role === "SUPERADMIN") {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
  const received = data.txSum._sum.amountKop ?? BigInt(0);
  const withdrawn = data.payoutsCompletedSum._sum.amountKop ?? BigInt(0);
  return NextResponse.json({
    user: serializeUser(data.user),
    stats: buildStats(received, withdrawn, data.txCount, data.payoutsPendingCount),
    transactions: data.transactions.map(serializeTransaction),
    limit: parsed.limit,
    offset: parsed.offset,
  });
}

async function handlePatch(
  request: NextRequest,
  params: Promise<{ id: string }>,
  actorId: string,
): Promise<NextResponse> {
  const { id } = await params;
  const bodyResult = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!bodyResult.ok) return bodyResult.response;
  const parsed = updateUserSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Неверные данные", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const existing = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
  if (id === actorId && parsed.data.isBlocked === true) {
    return NextResponse.json(
      { error: "Нельзя заблокировать самого себя" },
      { status: 400 },
    );
  }
  const data: {
    isBlocked?: boolean;
    payoutDailyLimitCount?: number | null;
    payoutDailyLimitKop?: bigint | null;
    payoutMonthlyLimitCount?: number | null;
    payoutMonthlyLimitKop?: bigint | null;
    autoConfirmPayouts?: boolean;
    autoConfirmPayoutThresholdKop?: bigint | null;
  } = {};
  if (parsed.data.isBlocked !== undefined) data.isBlocked = parsed.data.isBlocked;
  if (parsed.data.payoutDailyLimitCount !== undefined) data.payoutDailyLimitCount = parsed.data.payoutDailyLimitCount;
  if (parsed.data.payoutDailyLimitKop !== undefined) {
    data.payoutDailyLimitKop = parsed.data.payoutDailyLimitKop != null ? BigInt(parsed.data.payoutDailyLimitKop) : null;
  }
  if (parsed.data.payoutMonthlyLimitCount !== undefined) data.payoutMonthlyLimitCount = parsed.data.payoutMonthlyLimitCount;
  if (parsed.data.payoutMonthlyLimitKop !== undefined) {
    data.payoutMonthlyLimitKop = parsed.data.payoutMonthlyLimitKop != null ? BigInt(parsed.data.payoutMonthlyLimitKop) : null;
  }
  if (parsed.data.autoConfirmPayouts !== undefined) data.autoConfirmPayouts = parsed.data.autoConfirmPayouts;
  if (parsed.data.autoConfirmPayoutThresholdKop !== undefined) {
    data.autoConfirmPayoutThresholdKop =
      parsed.data.autoConfirmPayoutThresholdKop != null ? BigInt(parsed.data.autoConfirmPayoutThresholdKop) : null;
  }
  const updated = await db.user.update({
    where: { id },
    data,
    select: USER_SELECT,
  });
  return NextResponse.json(serializeUser(updated));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;
  return handleGet(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;
  return handlePatch(request, params, auth.user.userId);
}
