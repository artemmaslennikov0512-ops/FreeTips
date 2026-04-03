import { NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import {
  CSRF_COOKIE_NAME,
  CSRF_COOKIE_PATH,
  CSRF_HEADER_NAME,
  CSRF_TOKEN_TTL_SECONDS,
} from "@/lib/security/csrf-constants";

export {
  CSRF_COOKIE_NAME,
  CSRF_COOKIE_PATH,
  CSRF_HEADER_NAME,
  CSRF_TOKEN_TTL_SECONDS,
};

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
