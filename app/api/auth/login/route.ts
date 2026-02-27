/**
 * POST /api/auth/login
 * Вход: логин + пароль. Выдаёт access + refresh (refresh в httpOnly cookie).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserRepository } from "@/lib/infrastructure/user-repository";
import { loginRequestSchema } from "@/lib/validations";
import { verifyPassword } from "@/lib/auth/password";
import { generateAccessToken, generateRefreshToken, setRefreshTokenCookie } from "@/lib/auth/jwt";
import { checkRateLimitByIP, getClientIP, AUTH_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError } from "@/lib/api/helpers";
import { z } from "zod";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const ip = getClientIP(request);
  try {
    const rateLimit = checkRateLimitByIP(ip, AUTH_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Попробуйте позже." },
        { status: 429 },
      );
    }

    const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
    if (!parsed.ok) return parsed.response;
    const validated = loginRequestSchema.parse(parsed.data);

    const userRepo = getUserRepository();
    const user = await userRepo.findByLogin(validated.login);

    if (!user) {
      logSecurity("auth.login.failed", { requestId, ip, login: validated.login });
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 },
      );
    }

    if (user.isBlocked && user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      logSecurity("auth.login.blocked", { requestId, ip, userId: user.id });
      return NextResponse.json(
        { error: "Доступ к личному кабинету ограничен" },
        { status: 403 },
      );
    }

    const isValidPassword = await verifyPassword(validated.password, user.passwordHash);
    if (!isValidPassword) {
      logSecurity("auth.login.failed", { requestId, ip, userId: user.id });
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 },
      );
    }

    const tokenPayload = {
      userId: user.id,
      login: user.login,
      role: user.role,
    };

    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);

    // Сохраняем refresh token в cookie
    await setRefreshTokenCookie(refreshToken);

    // Создаём сессию
    await db.session.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceInfo: JSON.stringify({ ip }),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
      },
    });

    logSecurity("auth.login.success", { requestId, ip, userId: user.id });
    return NextResponse.json(
      {
        accessToken,
        user: {
          id: user.id,
          login: user.login,
          email: user.email,
          role: user.role,
        },
        mustChangePassword: user.mustChangePassword,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.issues.map((e) => ({
        path: e.path.join(".") || "(корневой)",
        message: e.message,
      }));
      const message = details[0]?.message ?? "Неверные данные";
      return jsonError(400, message, details);
    }

    logError("auth.login.error", error, { requestId, ip });
    return internalError("Ошибка при входе");
  }
}
