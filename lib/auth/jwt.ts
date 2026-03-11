/**
 * JWT токены: генерация и валидация
 * Использует jose (современная альтернатива jsonwebtoken, лучше для Edge/Next.js)
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

import { getJwtSecret, getJwtRefreshSecret, getNodeEnv } from "@/lib/config";

function getJWTSecretKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

function getJWTRefreshSecretKey(): Uint8Array {
  return new TextEncoder().encode(getJwtRefreshSecret());
}

// Время жизни токенов (access 24h — без постоянного выброса из кабинета; refresh продлевает сессию до 7 дней)
const ACCESS_TOKEN_EXPIRES_IN = "24h";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

export interface TokenPayload extends JWTPayload {
  userId: string;
  login: string;
  role: string;
}

/**
 * Генерирует access token (короткоживущий)
 */
export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
    .sign(getJWTSecretKey());

  return token;
}

/**
 * Генерирует refresh token (долгоживущий)
 */
export async function generateRefreshToken(payload: TokenPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRES_IN)
    .sign(getJWTRefreshSecretKey());

  return token;
}

/**
 * Валидирует access token (явно только HS256).
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecretKey(), { algorithms: ["HS256"] });
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Валидирует refresh token (явно только HS256).
 */
export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTRefreshSecretKey(), { algorithms: ["HS256"] });
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Сохраняет refresh token в httpOnly cookie
 */
export async function setRefreshTokenCookie(token: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set("refreshToken", token, {
      httpOnly: true,
      secure: getNodeEnv() === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 дней в секундах
      path: "/",
    });
  } catch (error) {
    const { logWarn } = await import("@/lib/logger");
    logWarn("refresh_token_cookie.set_failed", { error: String(error) });
  }
}

/**
 * Получает refresh token из cookie
 */
export async function getRefreshTokenCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("refreshToken")?.value ?? null;
  } catch {
    // В статической генерации cookies() может быть недоступен
    return null;
  }
}

/**
 * Удаляет refresh token cookie
 */
export async function deleteRefreshTokenCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("refreshToken");
  } catch (error) {
    const { logWarn } = await import("@/lib/logger");
    logWarn("refresh_token_cookie.delete_failed", { error: String(error) });
  }
}
