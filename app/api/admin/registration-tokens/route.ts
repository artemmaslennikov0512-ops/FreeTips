/**
 * POST /api/admin/registration-tokens
 * Создаёт одноразовые токены для регистрации пользователей.
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
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";
import { z } from "zod";

const MAX_BULK_REG_TOKENS = 300;

const bodySchema = z.object({
  count: z.number().int().min(1).max(MAX_BULK_REG_TOKENS).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const parsedBody = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsedBody.ok) return parsedBody.response;
  const body = bodySchema.safeParse(parsedBody.data ?? {});
  if (!body.success) {
    return NextResponse.json(
      { error: "Неверные данные", issues: body.error.issues },
      { status: 400 },
    );
  }

  const count = body.data.count ?? 1;
  const expiresAt = getRegistrationTokenExpiresAt();
  const tokens = Array.from({ length: count }, () => generateRegistrationToken());
  await db.registrationToken.createMany({
    data: tokens.map((token) => ({
      tokenHash: hashRegistrationToken(token),
      createdById: auth.user.userId,
      expiresAt,
    })),
  });

  const baseUrl = getBaseUrlFromRequest(request.nextUrl.origin);
  const links = tokens.map((token) => `${baseUrl}/register?token=${encodeURIComponent(token)}`);

  if (count === 1) {
    return NextResponse.json(
      { token: tokens[0], link: links[0], expiresAt: expiresAt.toISOString(), oneTime: true },
      { status: 201 },
    );
  }

  return NextResponse.json({
    count,
    links,
    expiresAt: expiresAt.toISOString(),
    oneTime: true,
  }, { status: 201 });
}
