/**
 * POST /api/profile/api-key — создать или перегенерировать API-ключ для приложения.
 * Требует: Authorization: Bearer <access_token>
 * Ответ: { "apiKey": "<новый ключ>" }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrApiKey } from "@/lib/auth-or-api-key";
import { generateApiKey } from "@/lib/auth/api-key";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;

  const apiKey = generateApiKey();

  await db.user.update({
    where: { id: auth.userId },
    data: { apiKey },
  });

  return NextResponse.json({ apiKey });
}
