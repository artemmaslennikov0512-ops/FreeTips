/**
 * POST /api/admin/users/[id]/sd-pay-out-page
 * Вывод средств официанта через SDPayOutPage (редирект на Paygine), как в ЛК официанта.
 * Требует: SUPERADMIN. Возвращает formUrl и formFields для открытия формы в новой вкладке.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { getBalance } from "@/lib/balance";
import { getUtcDayStart, getEffectivePayoutLimits } from "@/lib/payout-limits";
import { feeKopForPayout } from "@/lib/payment/paygine-fee";
import { registerOrder, buildSDPayOutPageFormParams, getSDPayOutPageEndpoint } from "@/lib/payment/paygine/client";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";

const AMOUNT_KOP_MIN = 10000; // 100 ₽
const AMOUNT_KOP_MAX = 100_000_00; // 100 000 ₽
const CURRENCY_RUB = 643;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const { id: targetUserId } = await params;

  const bodyResult = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!bodyResult.ok) return bodyResult.response;

  const data = bodyResult.data as unknown;
  const amountKop =
    typeof data === "object" && data !== null && "amountKop" in data
      ? Number((data as { amountKop: number }).amountKop)
      : NaN;
  if (!Number.isFinite(amountKop) || amountKop < AMOUNT_KOP_MIN || amountKop > AMOUNT_KOP_MAX) {
    return NextResponse.json(
      { error: "Укажите сумму от 100 до 100 000 ₽" },
      { status: 400 },
    );
  }

  const amountBigInt = BigInt(Math.round(amountKop));
  const feeKop = feeKopForPayout(amountKop);
  const totalDebitKop = amountBigInt + BigInt(feeKop);

  const { balanceKop } = await getBalance(targetUserId);
  if (totalDebitKop > balanceKop) {
    return NextResponse.json(
      {
        error: "Недостаточно средств на балансе официанта",
        hint: `С учётом комиссии ${(feeKop / 100).toFixed(2)} ₽ нужно ${Number(totalDebitKop) / 100} ₽`,
      },
      { status: 400 },
    );
  }

  const user = await db.user.findUnique({
    where: { id: targetUserId },
    select: { paygineSdRef: true },
  });

  const sdRef = user?.paygineSdRef?.trim();
  if (!sdRef) {
    return NextResponse.json(
      { error: "Вывод через Paygine не настроен для этого официанта" },
      { status: 400 },
    );
  }

  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD?.trim();
  if (!sector || !password) {
    return NextResponse.json(
      { error: "Платёжная система временно недоступна" },
      { status: 503 },
    );
  }

  const dayStart = getUtcDayStart();
  const limits = await getEffectivePayoutLimits(targetUserId);

  const [todayCount, todaySum] = await Promise.all([
    db.payoutRequest.count({
      where: { userId: targetUserId, createdAt: { gte: dayStart } },
    }),
    db.payoutRequest.aggregate({
      where: { userId: targetUserId, createdAt: { gte: dayStart } },
      _sum: { amountKop: true },
    }),
  ]);

  if (todayCount >= limits.count) {
    return NextResponse.json(
      { error: `Превышен лимит официанта: не более ${limits.count} заявок в сутки` },
      { status: 400 },
    );
  }
  const todaySumKop = todaySum._sum.amountKop ?? BigInt(0);
  if (todaySumKop + amountBigInt > limits.kop) {
    return NextResponse.json(
      { error: `Превышен лимит официанта: не более ${Number(limits.kop) / 100} ₽ вывода в сутки` },
      { status: 400 },
    );
  }

  const envAppUrl =
    typeof process.env.NEXT_PUBLIC_APP_URL === "string" ? process.env.NEXT_PUBLIC_APP_URL.trim() : "";
  const baseUrl =
    envAppUrl ? envAppUrl.replace(/\/$/, "") : getBaseUrlFromRequest(request.nextUrl.origin);

  const payout = await db.payoutRequest.create({
    data: {
      userId: targetUserId,
      amountKop: amountBigInt,
      details: "Вывод через страницу Paygine (SDPayOutPage), инициирован администратором",
    },
    select: { id: true },
  });

  const successUrl = `${baseUrl}/cabinet/payout-return?success=1&payoutId=${payout.id}`;
  const failUrl = `${baseUrl}/cabinet/payout-return?success=0&payoutId=${payout.id}`;
  const notifyUrl = `${baseUrl}/api/payment/webhook`;

  const amountRub = (Number(amountBigInt) / 100).toFixed(2);
  const feeRub = (feeKop / 100).toFixed(2);
  const totalRub = ((Number(amountBigInt) + feeKop) / 100).toFixed(2);
  const description =
    `Вывод ${amountRub} ₽ на карту. С баланса списано ${totalRub} ₽ (комиссия ${feeRub} ₽)`.slice(0, 1000);

  const registerResult = await registerOrder(
    { sector, password },
    {
      amount: Number(amountBigInt),
      currency: CURRENCY_RUB,
      reference: payout.id,
      description,
      fee: feeKop,
      url: successUrl,
      failurl: failUrl,
      notify_url: notifyUrl,
      sd_ref: sdRef,
    },
  );

  if (!registerResult.ok) {
    await db.payoutRequest.delete({ where: { id: payout.id } }).catch(() => {});
    return NextResponse.json(
      {
        error: "Ошибка регистрации заказа в платёжной системе",
        code: registerResult.code,
        description: registerResult.description,
      },
      { status: 502 },
    );
  }

  await db.payoutRequest.update({
    where: { id: payout.id },
    data: { externalId: String(registerResult.orderId), status: "PROCESSING" },
  });

  const formParams = buildSDPayOutPageFormParams(
    { sector, password },
    { orderId: registerResult.orderId, sdRef },
  );
  const formUrl = getSDPayOutPageEndpoint();

  return NextResponse.json({
    formUrl,
    formFields: formParams,
    payoutId: payout.id,
  });
}
