/**
 * POST /api/profile/change-password
 * Смена пароля: currentPassword, newPassword, newPasswordConfirm.
 * Требует: Authorization: Bearer <access_token>
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { getUserRepository } from "@/lib/infrastructure/user-repository";
import { changePasswordSchema } from "@/lib/validations";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { getClientIP } from "@/lib/middleware/rate-limit";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError } from "@/lib/api/helpers";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const ip = getClientIP(request);
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsed.ok) return parsed.response;

  const validated = changePasswordSchema.safeParse(parsed.data);
  if (!validated.success) {
    logSecurity("profile.change_password.invalid", { requestId, ip, userId: auth.user.userId });
    return jsonError(400, "Неверные данные", validated.error.issues);
  }

  const { currentPassword, newPassword } = validated.data;

  const userRepo = getUserRepository();
  const user = await userRepo.findById(auth.user.userId);

  if (!user) {
    logSecurity("profile.change_password.user_not_found", { requestId, ip, userId: auth.user.userId });
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    logSecurity("profile.change_password.wrong_current", { requestId, ip, userId: auth.user.userId });
    return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 400 });
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: auth.user.userId },
        data: {
          passwordHash: await hashPassword(newPassword),
          mustChangePassword: false,
        },
      });
      await tx.session.deleteMany({ where: { userId: auth.user.userId } });
    });
    logSecurity("profile.change_password.success", { requestId, ip, userId: auth.user.userId });
  } catch (error) {
    logError("profile.change_password.error", error, { requestId, ip, userId: auth.user.userId });
    return internalError("Ошибка смены пароля");
  }

  return NextResponse.json({ success: true });
}
