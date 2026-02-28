/**
 * GET /api/payouts — список заявок на вывод текущего пользователя.
 * POST /api/payouts — создание заявки (amountKop, details), проверка баланса.
 * Требует: Authorization: Bearer <access_token>
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrApiKey } from "@/lib/auth-or-api-key";
import { db } from "@/lib/db";
import { createPayoutSchema } from "@/lib/validations";
import { getBalance } from "@/lib/balance";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";
import { getUtcDayStart, getUtcMonthStart, getEffectivePayoutLimits, getEffectiveMonthlyPayoutLimits } from "@/lib/payout-limits";
import { sendPayoutToPaygine, isPayginePayoutAutoSendEnabled } from "@/lib/payment/send-payout-to-paygine";
import { feeKopForPayout } from "@/lib/payment/paygine-fee";
import { logSecurity } from "@/lib/logger";
import { broadcastBalanceUpdated } from "@/lib/ws-broadcast";
import { requestPaygineBalance } from "@/lib/payment/request-paygine-balance";
import { getRequestId } from "@/lib/security/request";
import { getClientIP } from "@/lib/middleware/rate-limit";

export async function GET(request: NextRequest) {
  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;

  const [list, { balanceKop }] = await Promise.all([
    db.payoutRequest.findMany({
      where: { userId: auth.userId },
      select: { id: true, amountKop: true, status: true, createdAt: true, details: true },
      orderBy: { createdAt: "desc" },
    }),
    getBalance(auth.userId),
  ]);

  const payouts = list.map((p) => ({
    id: p.id,
    amountKop: Number(p.amountKop),
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    details: p.details,
  }));

  return NextResponse.json({ payouts, balanceKop: Number(balanceKop) });
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const ip = getClientIP(request);

  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;

  const bodyResult = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = createPayoutSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    logSecurity("payout.create.invalid_payload", {
      rule: "payout_validation",
      action: "reject",
      requestId,
      ip,
      userId: auth.userId,
    });
    return NextResponse.json(
      { error: "Неверные данные", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { amountKop, details, recipientName, pan } = parsed.data;
  const amountBigInt = typeof amountKop === "number" ? BigInt(amountKop) : amountKop;
  const amountNum = Number(amountBigInt);
  const payoutFeeKop = feeKopForPayout(amountNum);
  const totalDebitKop = amountBigInt + BigInt(payoutFeeKop);

  const { balanceKop } = await getBalance(auth.userId);
  if (totalDebitKop > balanceKop) {
    return NextResponse.json(
      {
        error: "Недостаточно средств на балансе",
        hint: payoutFeeKop > 0 ? `С учётом комиссии вывода ${(payoutFeeKop / 100).toFixed(2)} ₽ нужно ${Number(totalDebitKop) / 100} ₽` : undefined,
      },
      { status: 400 },
    );
  }

  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { autoConfirmPayouts: true, autoConfirmPayoutThresholdKop: true, paygineSdRef: true },
  });
  const paygineConfigured = isPayginePayoutAutoSendEnabled();
  if (
    user?.autoConfirmPayouts === true &&
    user?.paygineSdRef?.trim() &&
    paygineConfigured &&
    (!pan || pan.replace(/\s/g, "").trim().length < 8)
  ) {
    return NextResponse.json(
      { error: "Для автовывода в Paygine укажите номер карты (pan)" },
      { status: 400 },
    );
  }
  if (user?.autoConfirmPayoutThresholdKop != null && amountBigInt > user.autoConfirmPayoutThresholdKop) {
    const maxRub = Number(user.autoConfirmPayoutThresholdKop) / 100;
    return NextResponse.json(
      { error: `Максимальная сумма одной операции вывода: ${maxRub.toLocaleString("ru-RU")} ₽` },
      { status: 400 },
    );
  }

  const dayStart = getUtcDayStart();
  const monthStart = getUtcMonthStart();
  const [limits, monthlyLimits] = await Promise.all([
    getEffectivePayoutLimits(auth.userId),
    getEffectiveMonthlyPayoutLimits(auth.userId),
  ]);

  const [todayCount, todaySum, monthCount, monthSum] = await Promise.all([
    db.payoutRequest.count({
      where: { userId: auth.userId, createdAt: { gte: dayStart } },
    }),
    db.payoutRequest.aggregate({
      where: { userId: auth.userId, createdAt: { gte: dayStart } },
      _sum: { amountKop: true },
    }),
    monthlyLimits.count != null
      ? db.payoutRequest.count({
          where: { userId: auth.userId, createdAt: { gte: monthStart } },
        })
      : Promise.resolve(0),
    monthlyLimits.kop != null
      ? db.payoutRequest.aggregate({
          where: { userId: auth.userId, createdAt: { gte: monthStart } },
          _sum: { amountKop: true },
        })
      : Promise.resolve({ _sum: { amountKop: null as bigint | null } }),
  ]);

  if (todayCount >= limits.count) {
    logSecurity("payout.create.limit_daily_count", {
      rule: "payout_daily_count",
      action: "reject",
      requestId,
      ip,
      userId: auth.userId,
      amountKop: Number(amountBigInt),
      limit: limits.count,
    });
    return NextResponse.json(
      { error: `Превышен лимит: не более ${limits.count} заявок в сутки` },
      { status: 400 },
    );
  }
  const todaySumKop = todaySum._sum.amountKop ?? BigInt(0);
  if (todaySumKop + amountBigInt > limits.kop) {
    logSecurity("payout.create.limit_daily_kop", {
      rule: "payout_daily_kop",
      action: "reject",
      requestId,
      ip,
      userId: auth.userId,
      amountKop: Number(amountBigInt),
      limitKop: Number(limits.kop),
    });
    const limitRub = Number(limits.kop) / 100;
    return NextResponse.json(
      { error: `Превышен лимит: не более ${limitRub.toLocaleString("ru-RU")} ₽ вывода в сутки` },
      { status: 400 },
    );
  }

  if (monthlyLimits.count != null && monthCount >= monthlyLimits.count) {
    logSecurity("payout.create.limit_monthly_count", {
      rule: "payout_monthly_count",
      action: "reject",
      requestId,
      ip,
      userId: auth.userId,
      amountKop: Number(amountBigInt),
      limit: monthlyLimits.count,
    });
    return NextResponse.json(
      { error: `Превышен лимит: не более ${monthlyLimits.count} заявок в месяц` },
      { status: 400 },
    );
  }
  const monthSumKop = monthSum._sum?.amountKop ?? BigInt(0);
  if (monthlyLimits.kop != null && monthSumKop + amountBigInt > monthlyLimits.kop) {
    logSecurity("payout.create.limit_monthly_kop", {
      rule: "payout_monthly_kop",
      action: "reject",
      requestId,
      ip,
      userId: auth.userId,
      amountKop: Number(amountBigInt),
      limitKop: Number(monthlyLimits.kop),
    });
    const limitRub = Number(monthlyLimits.kop) / 100;
    return NextResponse.json(
      { error: `Превышен лимит: не более ${limitRub.toLocaleString("ru-RU")} ₽ вывода в месяц` },
      { status: 400 },
    );
  }

  const payout = await db.payoutRequest.create({
    data: {
      userId: auth.userId,
      amountKop: amountBigInt,
      details,
      recipientName: recipientName?.trim() || null,
    },
    select: { id: true, amountKop: true, status: true, createdAt: true },
  });

  let finalStatus = payout.status;
  const shouldAutoConfirm =
    user?.autoConfirmPayouts === true &&
    (user.autoConfirmPayoutThresholdKop == null || amountBigInt <= user.autoConfirmPayoutThresholdKop);

  const canAutoSendPaygine =
    shouldAutoConfirm &&
    user?.paygineSdRef?.trim() &&
    pan &&
    pan.replace(/\s/g, "").length >= 8 &&
    isPayginePayoutAutoSendEnabled();

  if (canAutoSendPaygine) {
    const panClean = pan.replace(/\s/g, "").trim();
    const result = await sendPayoutToPaygine(payout.id, {
      pan: panClean,
      completedByUserId: auth.userId,
    });
    if (result.success) {
      finalStatus = "COMPLETED";
      logSecurity("payout.auto_sent_to_paygine", {
        payoutId: payout.id,
        userId: auth.userId,
        operationId: result.operationId ?? null,
      });
    } else {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          description: result.description,
          payoutId: payout.id,
          status: "CREATED",
        },
        { status: 502 },
      );
    }
  } else if (shouldAutoConfirm) {
    await db.payoutRequest.update({
      where: { id: payout.id },
      data: { status: "COMPLETED" },
    });
    finalStatus = "COMPLETED";
    void broadcastBalanceUpdated(auth.userId);
    void requestPaygineBalance(auth.userId);
  }

  return NextResponse.json(
    {
      payout: {
        id: payout.id,
        amountKop: Number(payout.amountKop),
        status: finalStatus,
        createdAt: payout.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
