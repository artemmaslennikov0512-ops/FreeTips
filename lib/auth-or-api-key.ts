/**
 * Авторизация по Bearer (JWT) или по X-API-Key для мобильного приложения FreeTips.
 * Если есть X-API-Key — используем его; иначе — Bearer.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { requireApiKey } from "@/lib/api-key-auth";

export type AuthUserId = { userId: string; role?: string };

/**
 * Возвращает userId (и при Bearer — role) при успешной авторизации (Bearer или X-API-Key).
 * role нужен для маршрутов, где SUPERADMIN имеет расширенный доступ (например, чеки любых выплат).
 */
export async function requireAuthOrApiKey(
  request: NextRequest,
): Promise<
  | AuthUserId
  | { response: NextResponse }
> {
  const apiKey = request.headers.get("x-api-key")?.trim();
  if (apiKey && apiKey.length >= 16) {
    const apiResult = await requireApiKey(request);
    if (apiResult.response) return { response: apiResult.response };
    return { userId: apiResult.userId };
  }

  const authResult = await requireAuth(request);
  if (authResult.response) return { response: authResult.response };
  return { userId: authResult.user.userId, role: authResult.user.role };
}
