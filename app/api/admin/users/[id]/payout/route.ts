/**
 * POST /api/admin/users/[id]/payout
 * Создаёт заявку на вывод от имени пользователя и сразу подтверждает (COMPLETED).
 * Требует: Authorization: Bearer <access_token>, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { getBalance } from "@/lib/balance";
import { z } from "zod";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";
import { broadcastBalanceUpdated } from "@/lib/ws-broadcast";
import { requestPaygineBalance } from "@/lib/payment/request-paygine-balance";

const adminPayoutSchema = z.object({
  amountKop: z.number().int().positive("Сумма должна быть положительной"),
  details: z.string().min(1, "Реквизиты обязательны").max(1000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const { id } = await params;

  const bodyResult = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = adminPayoutSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Неверные данные", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const amountBigInt = BigInt(parsed.data.amountKop);
  const { balanceKop } = await getBalance(id);
  if (amountBigInt > balanceKop) {
    return NextResponse.json({ error: "Недостаточно средств на балансе" }, { status: 400 });
  }

  const payout = await db.payoutRequest.create({
    data: {
      userId: id,
      amountKop: amountBigInt,
      details: parsed.data.details,
      status: "COMPLETED",
    },
    select: { id: true, amountKop: true, status: true, createdAt: true },
  });

  void broadcastBalanceUpdated(id);
  void requestPaygineBalance(id);

  return NextResponse.json(
    {
      payout: {
        id: payout.id,
        amountKop: Number(payout.amountKop),
        status: payout.status,
        createdAt: payout.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
