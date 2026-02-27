/**
 * Rate limiting по IP и userId
 * MVP: простой in-memory store (один инстанс приложения).
 * При горизонтальном масштабировании (несколько инстансов) лимиты не общие — рекомендуется
 * вынести хранилище в Redis (или аналог) и заменить Map на вызовы Redis INCR/EXPIRE.
 */

import type { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (в production использовать Redis)
const ipStore = new Map<string, RateLimitEntry>();
const userIdStore = new Map<string, RateLimitEntry>();
const genericStore = new Map<string, RateLimitEntry>();

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 100;

/** Окно и лимит для auth (login/register) */
export const AUTH_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  keyPrefix: "auth",
} as const;

/** Окно и лимит для публичной подачи заявки на регистрацию */
export const REGISTRATION_REQUEST_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: "reg-request",
} as const;

/** Окно и лимит для webhook платёжного провайдера (защита от флуда) */
export const WEBHOOK_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyPrefix: "webhook",
} as const;

/** Окно и лимит для POST /api/pay/[slug] по IP (антифрод) */
export const PAY_RATE_LIMIT_IP = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 60,
  keyPrefix: "pay-ip",
} as const;

/** Окно и лимит для POST /api/pay/[slug] по slug (защита от накрутки) */
export const PAY_RATE_LIMIT_SLUG = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  keyPrefix: "pay-slug",
} as const;

type RateLimitOptions = {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
};

type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

function resolveOptions(options?: RateLimitOptions): Required<RateLimitOptions> {
  return {
    windowMs: options?.windowMs ?? DEFAULT_WINDOW_MS,
    maxRequests: options?.maxRequests ?? DEFAULT_MAX_REQUESTS,
    keyPrefix: options?.keyPrefix ?? "",
  };
}

function buildKey(prefix: string, key: string): string {
  return prefix ? `${prefix}:${key}` : key;
}

function checkRateLimit(
  store: Map<string, RateLimitEntry>,
  key: string,
  windowMs: number,
  maxRequests: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Проверяет rate limit по IP
 */
export function checkRateLimitByIP(ip: string, options?: RateLimitOptions): RateLimitResult {
  const resolved = resolveOptions(options);
  const key = buildKey(resolved.keyPrefix, ip);
  return checkRateLimit(ipStore, key, resolved.windowMs, resolved.maxRequests);
}

/**
 * Проверяет rate limit по произвольному ключу (например slug).
 */
export function checkRateLimitByKey(
  key: string,
  options: RateLimitOptions & { keyPrefix: string },
): RateLimitResult {
  const resolved = resolveOptions(options);
  const fullKey = buildKey(resolved.keyPrefix, key);
  return checkRateLimit(
    genericStore,
    fullKey,
    resolved.windowMs,
    resolved.maxRequests,
  );
}

/**
 * Проверяет rate limit по userId
 */
export function checkRateLimitByUserId(
  userId: string,
  options?: RateLimitOptions,
): RateLimitResult {
  const resolved = resolveOptions(options);
  const key = buildKey(resolved.keyPrefix, userId);
  return checkRateLimit(userIdStore, key, resolved.windowMs, resolved.maxRequests);
}

/**
 * Получает IP адрес из request.
 * Важно: в production прокси (Nginx, Vercel и т.д.) должен передавать x-forwarded-for или x-real-ip,
 * иначе все запросы без заголовков получат ключ "unknown" и будут делить один rate limit.
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

/**
 * Очищает истёкшие записи (можно вызывать периодически)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of ipStore.entries()) {
    if (now > entry.resetAt) {
      ipStore.delete(key);
    }
  }
  for (const [key, entry] of userIdStore.entries()) {
    if (now > entry.resetAt) {
      userIdStore.delete(key);
    }
  }
  for (const [key, entry] of genericStore.entries()) {
    if (now > entry.resetAt) {
      genericStore.delete(key);
    }
  }
}
