/**
 * POST /api/admin/users/auto-confirm-bulk
 * Включить/выключить автоподтверждение выводов и порог для всех пользователей (кроме SUPERADMIN).
 * Требует: Authorization: Bearer <access_token>, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";
import { UserRole } from "@prisma/client";

const bodySchema = z.object({
  enabled: z.boolean(),
  thresholdKop: z.number().int().min(0).nullable().optional(),
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

  const data: { autoConfirmPayouts: boolean; autoConfirmPayoutThresholdKop: bigint | null } = {
    autoConfirmPayouts: parsed.data.enabled,
    autoConfirmPayoutThresholdKop:
      parsed.data.thresholdKop != null ? BigInt(parsed.data.thresholdKop) : null,
  };

  const result = await db.user.updateMany({
    where: { role: { not: UserRole.SUPERADMIN } },
    data,
  });

  return NextResponse.json({
    updated: result.count,
    message: `Обновлено пользователей: ${result.count}. Автоподтверждение: ${parsed.data.enabled ? "включено" : "выключено"}.`,
  });
}
