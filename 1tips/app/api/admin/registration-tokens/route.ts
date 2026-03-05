/**
 * POST /api/admin/registration-tokens
 * Создаёт одноразовый токен для регистрации одного пользователя.
 * Требует: Authorization: Bearer <access_token>, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import {
  generateRegistrationToken,
  hashRegistrationToken,
  getRegistrationTokenExpiresAt,
} from "@/lib/auth/registration-token";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";

export async function POST(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;
  const token = generateRegistrationToken();
  const tokenHash = hashRegistrationToken(token);
  const expiresAt = getRegistrationTokenExpiresAt();
  await db.registrationToken.create({ data: { tokenHash, createdById: auth.user.userId, expiresAt } });
  const baseUrl = getBaseUrlFromRequest(request.nextUrl.origin);
  const link = `${baseUrl}/register?token=${encodeURIComponent(token)}`;
  return NextResponse.json(
    { token, link, expiresAt: expiresAt.toISOString(), oneTime: true },
    { status: 201 },
  );
}
