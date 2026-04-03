/**
 * POST /api/admin/users/[id]/cabinet-token
 * Выдаёт access JWT от имени пользователя с ролью RECIPIENT или EMPLOYEE для просмотра ЛК супер-админом.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { generateImpersonationAccessToken } from "@/lib/auth/jwt";
import { logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { getClientIP } from "@/lib/middleware/rate-limit";

const ALLOWED_TARGET_ROLES = new Set<UserRole>([UserRole.RECIPIENT, UserRole.EMPLOYEE]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const requestId = getRequestId(request);
  const ip = getClientIP(request);
  const { id: targetId } = await params;

  if (targetId === auth.user.userId) {
    return NextResponse.json({ error: "Нельзя открыть кабинет от своего же аккаунта" }, { status: 400 });
  }

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, login: true, role: true, isBlocked: true },
  });

  if (!target || target.role === "SUPERADMIN") {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  if (!ALLOWED_TARGET_ROLES.has(target.role)) {
    return NextResponse.json(
      { error: "Кабинет доступен только для ролей получатель и официант (RECIPIENT, EMPLOYEE)" },
      { status: 400 },
    );
  }

  if (target.isBlocked) {
    return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
  }

  const accessToken = await generateImpersonationAccessToken(
    { userId: target.id, login: target.login, role: target.role },
    auth.user.userId,
  );

  logSecurity("admin.cabinet_impersonation.token_issued", {
    requestId,
    ip,
    impersonatorUserId: auth.user.userId,
    targetUserId: target.id,
    targetRole: target.role,
  });

  return NextResponse.json({
    accessToken,
    login: target.login,
    role: target.role,
  });
}
