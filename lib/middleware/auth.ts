/**
 * Middleware для проверки JWT и извлечения пользователя
 * Используется в API routes для защиты эндпоинтов
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type TokenPayload } from "@/lib/auth/jwt";
import { db } from "@/lib/db";

/**
 * Middleware для проверки JWT access token
 * Добавляет user в request, если токен валиден
 */
export async function requireAuth(
  request: NextRequest,
): Promise<{ user: TokenPayload; response?: never } | { user?: never; response: NextResponse }> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      response: NextResponse.json(
        { error: "Токен не предоставлен" },
        { status: 401 },
      ),
    };
  }

  const token = authHeader.substring(7);
  const payload = await verifyAccessToken(token);

  if (!payload || !payload.userId) {
    return {
      response: NextResponse.json(
        { error: "Недействительный токен" },
        { status: 401 },
      ),
    };
  }

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, isBlocked: true },
  });

  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 401 },
      ),
    };
  }

  if (user.isBlocked && user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    return {
      response: NextResponse.json(
        { error: "Доступ к личному кабинету ограничен" },
        { status: 403 },
      ),
    };
  }

  return { user: payload };
}

/**
 * Middleware для проверки роли (RBAC)
 * SUPERADMIN имеет доступ ко всем эндпоинтам ADMIN
 */
export function requireRole(allowedRoles: string[]) {
  return async (
    request: NextRequest,
  ): Promise<
    | { user: TokenPayload; response?: never }
    | { user?: never; response: NextResponse }
  > => {
    const authResult = await requireAuth(request);

    if ("response" in authResult) {
      return authResult;
    }

    const userRole = authResult.user.role;
    
    // SUPERADMIN имеет доступ ко всем эндпоинтам ADMIN
    const hasAccess =
      allowedRoles.includes(userRole) ||
      (userRole === "SUPERADMIN" && allowedRoles.includes("ADMIN"));

    if (!hasAccess) {
      return {
        response: NextResponse.json(
          { error: "Недостаточно прав" },
          { status: 403 },
        ),
      };
    }

    return authResult;
  };
}
