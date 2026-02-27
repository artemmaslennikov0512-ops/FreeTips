/**
 * GET /api/profile
 * Данные текущего пользователя (login, email, role) и статистика (баланс, всего получено, кол-во платежей, заявок на вывод).
 * PATCH /api/profile — обновление login, email.
 * Требует: Authorization: Bearer <access_token>
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrApiKey } from "@/lib/auth-or-api-key";
import { db } from "@/lib/db";
import { patchProfileSchema } from "@/lib/validations";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";
import { getEffectivePayoutLimits, getEffectiveMonthlyPayoutLimits, getUtcDayStart, getUtcMonthStart } from "@/lib/payout-limits";
import { sdGetBalance } from "@/lib/payment/paygine/client";
import { logError } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";

export async function GET(request: NextRequest) {
  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;

  const id = auth.userId;
  const requestId = getRequestId(request);

  try {
  const dayStart = getUtcDayStart();
  const monthStart = getUtcMonthStart();

  const [profile, txSum, payoutsCompletedSum, txCount, payoutsPendingCount, limits, monthlyLimits, todayPayouts, monthPayouts] =
    await Promise.all([
      db.user.findUnique({
        where: { id },
        select: {
          id: true,
          uniqueId: true,
          login: true,
          email: true,
          role: true,
          mustChangePassword: true,
          fullName: true,
          birthDate: true,
          establishment: true,
          apiKey: true,
          apiKeyHash: true,
          paygineSdRef: true,
        },
      }),
      db.transaction.aggregate({
        where: { recipientId: id, status: "SUCCESS" },
        _sum: { amountKop: true },
      }),
      db.payoutRequest.aggregate({
        where: { userId: id, status: "COMPLETED" },
        _sum: { amountKop: true },
      }),
      db.transaction.count({ where: { recipientId: id, status: "SUCCESS" } }),
      db.payoutRequest.count({
        where: { userId: id, status: { in: ["CREATED", "PROCESSING"] } },
      }),
      getEffectivePayoutLimits(id),
      getEffectiveMonthlyPayoutLimits(id),
      db.payoutRequest.aggregate({
        where: {
          userId: id,
          status: "COMPLETED",
          updatedAt: { gte: dayStart },
        },
        _count: true,
        _sum: { amountKop: true },
      }),
      db.payoutRequest.aggregate({
        where: {
          userId: id,
          status: "COMPLETED",
          updatedAt: { gte: monthStart },
        },
        _count: true,
        _sum: { amountKop: true },
      }),
    ]);

  if (!profile) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const received = txSum._sum.amountKop ?? BigInt(0);
  const withdrawn = payoutsCompletedSum._sum.amountKop ?? BigInt(0);
  const balanceCalculated = received - withdrawn;
  const todayCount = todayPayouts._count;
  const todaySumKop = todayPayouts._sum.amountKop ?? BigInt(0);
  const monthCount = monthPayouts._count;
  const monthSumKop = monthPayouts._sum.amountKop ?? BigInt(0);

  let balanceKopForStats = Number(balanceCalculated);
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD;
  const sdRef = profile.paygineSdRef?.trim();
  if (sdRef && sector && password) {
    try {
      const paygineBalance = await sdGetBalance({ sector, password }, { sdRef });
      if (paygineBalance.ok) {
        balanceKopForStats = paygineBalance.balanceKop;
      }
    } catch {
      // При недоступности Paygine отдаём баланс по БД, чтобы ЛК официанта загружался
    }
  }

  return NextResponse.json({
    id: profile.id,
    uniqueId: profile.uniqueId,
    login: profile.login,
    email: profile.email,
    role: profile.role,
    mustChangePassword: profile.mustChangePassword,
    fullName: profile.fullName,
    birthDate: profile.birthDate,
    establishment: profile.establishment,
    hasApiKey: !!(profile.apiKey ?? profile.apiKeyHash),
    stats: {
      balanceKop: balanceKopForStats,
      totalReceivedKop: Number(received),
      transactionsCount: txCount,
      payoutsPendingCount,
    },
    payoutLimits: {
      dailyLimitCount: limits.count,
      dailyLimitKop: Number(limits.kop),
      monthlyLimitCount: monthlyLimits.count,
      monthlyLimitKop: monthlyLimits.kop != null ? Number(monthlyLimits.kop) : null,
    },
    payoutUsageToday: {
      count: todayCount,
      sumKop: Number(todaySumKop),
    },
    payoutUsageMonth: {
      count: monthCount,
      sumKop: Number(monthSumKop),
    },
  });
  } catch (err) {
    logError("profile.get.error", err, { requestId, userId: id });
    return NextResponse.json(
      { error: "Не удалось загрузить профиль" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;

  const parsedBody = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = patchProfileSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Неверные данные", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data as {
    login?: string;
    email?: string | null;
    fullName?: string | null;
    birthDate?: string | null;
    establishment?: string | null;
  };
  if (
    !data.login &&
    data.email === undefined &&
    data.fullName === undefined &&
    data.birthDate === undefined &&
    data.establishment === undefined
  ) {
    return NextResponse.json({ error: "Нечего обновлять" }, { status: 400 });
  }

  const update: {
    login?: string;
    email?: string | null;
    fullName?: string | null;
    birthDate?: string | null;
    establishment?: string | null;
  } = {};
  if (data.login !== undefined) update.login = data.login;
  if (data.email !== undefined) update.email = data.email;
  if (data.fullName !== undefined) update.fullName = data.fullName;
  if (data.birthDate !== undefined) update.birthDate = data.birthDate;
  if (data.establishment !== undefined) update.establishment = data.establishment;

  if (update.login) {
    const taken = await db.user.findFirst({
      where: { login: update.login, NOT: { id: auth.userId } },
    });
    if (taken) {
      return NextResponse.json({ error: "Логин уже занят" }, { status: 409 });
    }
  }

  if (update.email !== undefined && update.email !== null) {
    const taken = await db.user.findFirst({
      where: { email: update.email, NOT: { id: auth.userId } },
    });
    if (taken) {
      return NextResponse.json({ error: "Email уже занят" }, { status: 409 });
    }
  }

  const profile = await db.user.update({
    where: { id: auth.userId },
    data: update,
    select: { id: true, uniqueId: true, login: true, email: true, role: true, fullName: true, birthDate: true, establishment: true },
  });

  return NextResponse.json(profile);
}
