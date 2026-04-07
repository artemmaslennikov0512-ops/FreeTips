/**
 * POST /api/admin/users/limits-push-all
 * Одним запросом выставить всем пользователям (кроме SUPERADMIN) полный набор лимитов и автовывод,
 * как на экране антифрода — перезаписывает точечные отличия в карточках.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";
import { UserRole } from "@prisma/client";
import { saveSystemDefaultLimits } from "@/lib/system-default-limits";

const bodySchema = z.object({
  dailyLimitCount: z.number().int().min(0).max(100).nullable(),
  dailyLimitKop: z.number().int().min(0).nullable(),
  monthlyLimitCount: z.number().int().min(0).max(3000).nullable(),
  monthlyLimitKop: z.number().int().min(0).nullable(),
  incomingMonthlyLimitKop: z.number().int().min(0).nullable(),
  autoConfirmPayouts: z.boolean(),
  autoConfirmThresholdKop: z.number().int().min(0).nullable(),
});

export async function POST(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const bodyResult = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = bodySchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Неверные данные", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const userData = {
    payoutDailyLimitCount: d.dailyLimitCount,
    payoutDailyLimitKop: d.dailyLimitKop != null ? BigInt(d.dailyLimitKop) : null,
    payoutMonthlyLimitCount: d.monthlyLimitCount,
    payoutMonthlyLimitKop: d.monthlyLimitKop != null ? BigInt(d.monthlyLimitKop) : null,
    incomingMonthlyLimitKop: d.incomingMonthlyLimitKop != null ? BigInt(d.incomingMonthlyLimitKop) : null,
    autoConfirmPayouts: d.autoConfirmPayouts,
    autoConfirmPayoutThresholdKop: d.autoConfirmThresholdKop != null ? BigInt(d.autoConfirmThresholdKop) : null,
  };

  const result = await db.user.updateMany({
    where: { role: { not: UserRole.SUPERADMIN } },
    data: userData,
  });

  await saveSystemDefaultLimits({
    payoutDailyLimitCount: d.dailyLimitCount,
    payoutDailyLimitKop: userData.payoutDailyLimitKop,
    payoutMonthlyLimitCount: d.monthlyLimitCount,
    payoutMonthlyLimitKop: userData.payoutMonthlyLimitKop,
    incomingMonthlyLimitKop: userData.incomingMonthlyLimitKop,
    autoConfirmPayouts: d.autoConfirmPayouts,
    autoConfirmPayoutThresholdKop: userData.autoConfirmPayoutThresholdKop,
  });

  return NextResponse.json({
    updated: result.count,
    message: `Обновлено пользователей: ${result.count}. Все лимиты и авто-вывод применены ко всем (точечные перезаписаны). Для новых аккаунтов — те же значения.`,
  });
}
