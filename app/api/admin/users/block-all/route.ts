/**
 * POST /api/admin/users/block-all — заблокировать всех пользователей кроме текущего.
 * Требует: Authorization: Bearer <access_token>, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const actorId = auth.user.userId;

  const result = await db.user.updateMany({
    where: { id: { not: actorId } },
    data: { isBlocked: true },
  });

  return NextResponse.json({
    blocked: result.count,
    message: `Заблокировано пользователей: ${result.count}`,
  });
}
