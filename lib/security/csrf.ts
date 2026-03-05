import { NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "crypto";

export const CSRF_COOKIE_NAME = "csrfToken";
export const CSRF_HEADER_NAME = "x-csrf-token";
export const CSRF_COOKIE_PATH = "/";
const HOUR_SECONDS = 60 * 60;
export const CSRF_TOKEN_TTL_SECONDS = 8 * HOUR_SECONDS;

export function generateCsrfToken(): string {
  return crypto.randomUUID();
}

function sha256(text: string): Buffer {
  return createHash("sha256").update(text, "utf8").digest();
}

/**
 * Проверка CSRF в API-маршрутах (cookie vs заголовок).
 * Сравнение через timing-safe сравнение хешей, чтобы не утекало по времени.
 */
export function verifyCsrfFromRequest(request: NextRequest): boolean {
  const cookie = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? "";
  const header = request.headers.get(CSRF_HEADER_NAME) ?? "";
  if (!cookie || !header) return false;
  const a = sha256(cookie);
  const b = sha256(header);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
