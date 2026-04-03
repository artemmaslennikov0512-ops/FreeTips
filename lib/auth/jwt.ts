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
const IMPERSONATION_ACCESS_EXPIRES_IN = "4h";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

export interface TokenPayload extends JWTPayload {
  userId: string;
  login: string;
  role: string;
  /** Выдан при входе супер-админа в кабинет пользователя (аудит). */
  impersonatorUserId?: string;
}

/**
 * Назначение одноразового JWT между паролем и выдачей сессии.
 * `login_2fa_pending` — публичный вход (/api/auth/login → /api/auth/login/totp).
 * `admin_2fa_pending` — зарезервировано под отдельный админский поток (не принимать на login/totp).
 */
export type TwoFactorPendingPurpose = "login_2fa_pending" | "admin_2fa_pending";

export interface TwoFactorPendingPayload extends JWTPayload {
  purpose: TwoFactorPendingPurpose;
  userId: string;
  login: string;
  role: string;
}

const LOGIN_2FA_PENDING_EXPIRES = "10m";

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
 * Access token от имени целевого пользователя для просмотра кабинета супер-админом.
 * Короче обычного access; refresh по cookie админа его не продлевает — клиент хранит бэкап токена админа.
 */
export async function generateImpersonationAccessToken(
  target: Pick<TokenPayload, "userId" | "login" | "role">,
  impersonatorUserId: string,
): Promise<string> {
  const body: TokenPayload = {
    userId: target.userId,
    login: target.login,
    role: target.role,
    impersonatorUserId,
  };
  return new SignJWT(body)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(IMPERSONATION_ACCESS_EXPIRES_IN)
    .sign(getJWTSecretKey());
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

export async function generateTwoFactorPendingToken(
  payload: Pick<TwoFactorPendingPayload, "userId" | "login" | "role">,
): Promise<string> {
  const body: TwoFactorPendingPayload = {
    ...payload,
    purpose: "login_2fa_pending",
  };
  return new SignJWT(body)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(LOGIN_2FA_PENDING_EXPIRES)
    .sign(getJWTSecretKey());
}

/**
 * Проверяет pending-JWT для 2FA. Допустимы оба purpose; маршрут входа в ЛК должен дополнительно требовать только `login_2fa_pending`.
 */
export async function verifyTwoFactorPendingToken(token: string): Promise<TwoFactorPendingPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecretKey(), { algorithms: ["HS256"] });
    const p = payload as TwoFactorPendingPayload & { purpose?: string };
    const okPurpose =
      p.purpose === "login_2fa_pending" || p.purpose === "admin_2fa_pending";
    if (!okPurpose || !p.userId || !p.login || !p.role) return null;
    return p as TwoFactorPendingPayload;
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
