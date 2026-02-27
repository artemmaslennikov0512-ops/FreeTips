/**
 * POST /api/admin/registration-tokens
 * Создаёт токен для регистрации пользователя.
 * Требует: Authorization: Bearer <access_token>, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import {
  generateRegistrationToken,
  hashRegistrationToken,
  REGISTRATION_TOKEN_TTL_MANUAL_MS,
} from "@/lib/auth/registration-token";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";

export async function POST(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;
  const token = generateRegistrationToken();
  const tokenHash = hashRegistrationToken(token);
  const expiresAt = new Date(Date.now() + REGISTRATION_TOKEN_TTL_MANUAL_MS);
  await db.registrationToken.create({ data: { tokenHash, createdById: auth.user.userId, expiresAt } });
  const baseUrl = getBaseUrlFromRequest(request.nextUrl.origin);
  const link = `${baseUrl}/register?token=${encodeURIComponent(token)}`;
  return NextResponse.json(
    { token, link, expiresAt: expiresAt.toISOString(), validHours: 1 },
    { status: 201 },
  );
}
