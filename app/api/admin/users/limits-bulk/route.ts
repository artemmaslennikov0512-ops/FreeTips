/**
 * POST /api/admin/users/limits-bulk
 * Установить суточные лимиты вывода для всех пользователей (кроме SUPERADMIN).
 * Требует: Authorization: Bearer <access_token>, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";
import { UserRole } from "@prisma/client";

const bodySchema = z.object({
  dailyLimitCount: z.number().int().min(0).max(100).nullable().optional(),
  dailyLimitKop: z.number().int().min(0).nullable().optional(),
  monthlyLimitCount: z.number().int().min(0).max(3000).nullable().optional(),
  monthlyLimitKop: z.number().int().min(0).nullable().optional(),
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

  const data: {
    payoutDailyLimitCount?: number | null;
    payoutDailyLimitKop?: bigint | null;
    payoutMonthlyLimitCount?: number | null;
    payoutMonthlyLimitKop?: bigint | null;
  } = {};
  if (parsed.data.dailyLimitCount !== undefined) data.payoutDailyLimitCount = parsed.data.dailyLimitCount;
  if (parsed.data.dailyLimitKop !== undefined) data.payoutDailyLimitKop = parsed.data.dailyLimitKop != null ? BigInt(parsed.data.dailyLimitKop) : null;
  if (parsed.data.monthlyLimitCount !== undefined) data.payoutMonthlyLimitCount = parsed.data.monthlyLimitCount;
  if (parsed.data.monthlyLimitKop !== undefined) data.payoutMonthlyLimitKop = parsed.data.monthlyLimitKop != null ? BigInt(parsed.data.monthlyLimitKop) : null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Не указаны лимиты для обновления" }, { status: 400 });
  }

  const result = await db.user.updateMany({
    where: { role: { not: UserRole.SUPERADMIN } },
    data,
  });

  return NextResponse.json({
    updated: result.count,
    message: `Обновлено пользователей: ${result.count}. Лимиты применены.`,
  });
}
