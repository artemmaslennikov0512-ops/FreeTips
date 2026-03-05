/**
 * POST /api/admin/users/[id]/password
 * Смена пароля пользователю админом (SUPERADMIN)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { passwordSchema } from "@/lib/validations";
import { hashPassword } from "@/lib/auth/password";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { getClientIP } from "@/lib/middleware/rate-limit";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError } from "@/lib/api/helpers";
import { z } from "zod";

const updatePasswordSchema = z
  .object({
    newPassword: passwordSchema,
    newPasswordConfirm: z.string().min(1, "Подтвердите пароль"),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    message: "Пароли не совпадают",
    path: ["newPasswordConfirm"],
  });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;
  const requestId = getRequestId(request);
  const ip = getClientIP(request);
  const { id } = await params;
  if (id === auth.user.userId) {
    return NextResponse.json({ error: "Нельзя менять пароль самому себе" }, { status: 400 });
  }

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsed.ok) return parsed.response;

  const validated = updatePasswordSchema.safeParse(parsed.data);
  if (!validated.success) {
    return jsonError(400, "Неверные данные", validated.error.issues);
  }

  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          passwordHash: await hashPassword(validated.data.newPassword),
          mustChangePassword: true,
        },
      });
      await tx.session.deleteMany({ where: { userId: id } });
    });
    logSecurity("admin.user.password_reset", { requestId, ip, userId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("admin.user.password_reset.error", error, { requestId, ip, userId: id });
    return internalError("Ошибка обновления пароля");
  }
}
