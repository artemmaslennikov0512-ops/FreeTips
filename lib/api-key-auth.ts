/**
 * Авторизация по X-API-Key для приложения FreeTips.
 * Заголовок: X-API-Key: <ключ>
 * Новые ключи: в БД только apiKeyPrefix + apiKeyHash (SHA-256). Старые — plaintext в apiKey.
 * Сравнение в константное время (timing-safe).
 */

import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiKeyPrefix, hashApiKey } from "@/lib/auth/api-key";

function constantTimeEqualBuffers(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
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

  const prefix = getApiKeyPrefix(apiKey);
  const keyHashHex = hashApiKey(apiKey);
  const keyHashBuffer = Buffer.from(keyHashHex, "utf8");

  let candidates = await db.user.findMany({
    where: { apiKeyPrefix: prefix },
    select: { id: true, isBlocked: true, apiKeyHash: true, apiKey: true },
  });

  if (candidates.length === 0) {
    const legacy = await db.user.findFirst({
      where: { apiKey },
      select: { id: true, isBlocked: true, apiKeyHash: true, apiKey: true },
    });
    if (legacy) candidates = [legacy];
  }

  for (const user of candidates) {
    let match = false;
    if (user.apiKeyHash) {
      const storedBuffer = Buffer.from(user.apiKeyHash, "utf8");
      match = constantTimeEqualBuffers(keyHashBuffer, storedBuffer);
    } else if (user.apiKey) {
      const storedHashHex = hashApiKey(user.apiKey);
      const storedBuffer = Buffer.from(storedHashHex, "utf8");
      match = constantTimeEqualBuffers(keyHashBuffer, storedBuffer);
    }
    if (match) {
      if (user.isBlocked) {
        const res = NextResponse.json(
          { error: "Доступ ограничен" },
          { status: 403 },
        );
        return { response: res };
      }
      return { userId: user.id };
    }
  }

  hashApiKey(apiKey);
  return {
    response: NextResponse.json(
      { error: "Неверный API-ключ" },
      { status: 401 },
    ),
  };
}
