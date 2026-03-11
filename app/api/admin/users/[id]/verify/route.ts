/**
 * POST /api/admin/users/[id]/verify — вручную подтвердить верификацию пользователя (без заявки).
 * Только SUPERADMIN. Устанавливает verificationStatus = VERIFIED и сбрасывает причину отказа.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { VerificationStatus } from "@prisma/client";
import { logSecurity } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;
  const { id: userId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, verificationStatus: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
  if (user.role === "SUPERADMIN") {
    return NextResponse.json({ error: "Нельзя верифицировать суперадмина" }, { status: 400 });
  }
  if (user.verificationStatus === VerificationStatus.VERIFIED) {
    return NextResponse.json({ error: "Пользователь уже верифицирован" }, { status: 400 });
  }

  await db.user.update({
    where: { id: userId },
    data: {
      verificationStatus: VerificationStatus.VERIFIED,
      verificationRejectionReason: null,
    },
  });

  const requestId = request.headers.get("x-request-id") ?? undefined;
  logSecurity("admin.user.manual_verify", { requestId, userId, adminId: auth.user.userId });

  return NextResponse.json({ ok: true });
}
