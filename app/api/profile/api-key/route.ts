/**
 * GET /api/profile/api-key — показать ключ, если он ещё хранится в открытом виде (устаревшие записи).
 * Для ключей только с хешем ответ 409 — полный ключ недоступен без пересоздания.
 *
 * POST /api/profile/api-key — создать или перегенерировать API-ключ для приложения.
 * Требует: Authorization: Bearer <access_token>
 * Ответ: { "apiKey": "<новый ключ>" }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrApiKey } from "@/lib/auth-or-api-key";
import { generateApiKey, getApiKeyPrefix, hashApiKey } from "@/lib/auth/api-key";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;

  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { apiKey: true, apiKeyHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
  if (user.apiKey) {
    return NextResponse.json({ apiKey: user.apiKey });
  }
  if (user.apiKeyHash) {
    return NextResponse.json(
      {
        error:
          "Ключ хранится в защищённом виде и не показывается. Создайте новый ключ — предыдущий перестанет работать.",
        code: "REVEAL_REQUIRES_ROTATE",
      },
      { status: 409 },
    );
  }
  return NextResponse.json({ error: "Ключ ещё не создан" }, { status: 404 });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;

  const apiKey = generateApiKey();
  await db.user.update({
    where: { id: auth.userId },
    data: {
      apiKey: null,
      apiKeyPrefix: getApiKeyPrefix(apiKey),
      apiKeyHash: hashApiKey(apiKey),
    },
  });

  return NextResponse.json({ apiKey });
}
