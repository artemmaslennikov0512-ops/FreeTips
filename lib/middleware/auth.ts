/**
 * Middleware для проверки JWT и извлечения пользователя.
 * Использует IUserRepository (по умолчанию — Prisma); в тестах можно подменить через setUserRepository().
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type TokenPayload } from "@/lib/auth/jwt";
import { getUserRepository } from "@/lib/infrastructure/user-repository";

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

  const repo = getUserRepository();
  const user = await repo.findByIdForAuth(payload.userId);

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

/**
 * Проверка: пользователь — управляющий заведением (ESTABLISHMENT_ADMIN) с заполненным establishmentId.
 * Возвращает payload и establishmentId для использования в API заведения.
 */
export async function requireEstablishmentAdmin(
  request: NextRequest,
): Promise<
  | { user: TokenPayload; establishmentId: string; response?: never }
  | { user?: never; establishmentId?: never; response: NextResponse }
> {
  const authResult = await requireRole(["ESTABLISHMENT_ADMIN"])(request);

  if ("response" in authResult && authResult.response) {
    return { response: authResult.response };
  }

  const repo = getUserRepository();
  const establishmentId = await repo.findEstablishmentIdByUserId(authResult.user.userId);

  if (!establishmentId) {
    return {
      response: NextResponse.json(
        { error: "Заведение не привязано к аккаунту" },
        { status: 403 },
      ),
    };
  }

  return {
    user: authResult.user,
    establishmentId,
  };
}
