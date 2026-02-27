/**
 * Авторизация по X-API-Key для приложения FreeTips.
 * Заголовок: X-API-Key: <ключ>
 * Сравнение ключа с БД — в константное время (timing-safe).
 */

import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function sha256(text: string): Buffer {
  return createHash("sha256").update(text, "utf8").digest();
}

function constantTimeEqual(a: string, b: string): boolean {
  const ha = sha256(a);
  const hb = sha256(b);
  if (ha.length !== hb.length) return false;
  return timingSafeEqual(ha, hb);
}

export async function requireApiKey(
  request: NextRequest,
): Promise<{ userId: string; response?: never } | { userId?: never; response: NextResponse }> {
  const apiKey = request.headers.get("x-api-key")?.trim();

  if (!apiKey || apiKey.length < 16) {
    return {
      response: NextResponse.json(
        { error: "Неверный или отсутствующий API-ключ" },
        { status: 401 },
      ),
    };
  }

  const user = await db.user.findFirst({
    where: { apiKey },
    select: { id: true, isBlocked: true, apiKey: true },
  });

  if (!user || !constantTimeEqual(apiKey, user.apiKey ?? "")) {
    if (!user) constantTimeEqual(apiKey, apiKey);
    return {
      response: NextResponse.json(
        { error: "Неверный API-ключ" },
        { status: 401 },
      ),
    };
  }

  if (user.isBlocked) {
    return {
      response: NextResponse.json(
        { error: "Доступ ограничен" },
        { status: 403 },
      ),
    };
  }

  return { userId: user.id };
}
