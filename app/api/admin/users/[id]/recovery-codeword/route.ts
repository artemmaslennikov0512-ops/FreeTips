/**
 * POST /api/admin/users/[id]/recovery-codeword
 * Установка / смена кодового слова для восстановления пароля (SUPERADMIN).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { adminRecoveryCodewordUpdateSchema } from "@/lib/validations";
import { hashPassword } from "@/lib/auth/password";
import { encryptRecoveryCodewordForAdminDisplay } from "@/lib/auth/recovery-codeword-crypto";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { getClientIP } from "@/lib/middleware/rate-limit";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError } from "@/lib/api/helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;
  const requestId = getRequestId(request);
  const ip = getClientIP(request);
  const { id } = await params;

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsed.ok) return parsed.response;

  const validated = adminRecoveryCodewordUpdateSchema.safeParse(parsed.data);
  if (!validated.success) {
    return jsonError(400, "Неверные данные", validated.error.issues);
  }

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!user || user.role === "SUPERADMIN") {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const plain = validated.data.recoveryCodeword;
  try {
    const recoveryCodewordHash = await hashPassword(plain);
    const recoveryCodewordEnc = encryptRecoveryCodewordForAdminDisplay(plain);
    await db.user.update({
      where: { id },
      data: { recoveryCodewordHash, recoveryCodewordEnc },
    });
    logSecurity("admin.user.recovery_codeword_set", { requestId, ip, targetUserId: id });
    return NextResponse.json({ success: true, recoveryCodeword: plain });
  } catch (error) {
    logError("admin.user.recovery_codeword.error", error, { requestId, ip, targetUserId: id });
    return internalError("Ошибка сохранения кодового слова");
  }
}
