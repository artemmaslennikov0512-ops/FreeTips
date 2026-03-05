/**
 * POST /api/admin/users/[id]/api-key
 * Создать или перегенерировать API-ключ пользователя (SUPERADMIN).
 * Ответ: { "apiKey": "<новый ключ>" }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { generateApiKey, getApiKeyPrefix, hashApiKey } from "@/lib/auth/api-key";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const { id } = await params;
  const user = await db.user.findFirst({
    where: { id, role: { not: "SUPERADMIN" } },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const apiKey = generateApiKey();
  await db.user.update({
    where: { id },
    data: {
      apiKey: null,
      apiKeyPrefix: getApiKeyPrefix(apiKey),
      apiKeyHash: hashApiKey(apiKey),
    },
  });

  return NextResponse.json({ apiKey });
}
