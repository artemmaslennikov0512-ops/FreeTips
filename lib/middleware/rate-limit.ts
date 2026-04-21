/**
 * Rate limiting по IP и userId.
 * При наличии REDIS_URL используется Redis (общий лимит при нескольких инстансах).
 * Иначе — in-memory store; периодическая очистка истёкших записей через startRateLimitCleanup().
 */

import type { NextRequest } from "next/server";
import { createHash } from "crypto";
import { checkRateLimitRedis } from "@/lib/rate-limit-redis";
import { getRedisUrl, getWebhookRateLimitPerMinute } from "@/lib/config";
import { cleanupWrongPasswordAttemptsExpired } from "@/lib/login-wrong-password-tracker";

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipStore = new Map<string, RateLimitEntry>();
const userIdStore = new Map<string, RateLimitEntry>();
const genericStore = new Map<string, RateLimitEntry>();

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 100;

/** Окно и лимит для auth (login, регистрация, верификация кода, сброс пароля и т.д.) — по IP */
export const AUTH_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 40,
  keyPrefix: "auth",
} as const;

/** Проверка TOTP при входе — жёстче против перебора */
export const AUTH_TOTP_VERIFY_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 25,
  keyPrefix: "auth-totp-verify",
} as const;

/** Окно и лимит для публичной подачи заявки на регистрацию */
export const REGISTRATION_REQUEST_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: "reg-request",
} as const;

type RateLimitOptions = {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
};

/** Окно и лимит для webhook платёжного провайдера (защита от флуда). maxRequests — из WEBHOOK_RATE_LIMIT_MAX или 600/мин. */
export function getWebhookRateLimitOptions(): RateLimitOptions & { keyPrefix: string } {
  return {
    windowMs: 60 * 1000,
    maxRequests: getWebhookRateLimitPerMinute(),
    keyPrefix: "webhook",
  };
}

const payIpDefaultMax =
  typeof process !== "undefined" && process.env.NODE_ENV === "production" ? 60 : 2000;
const paySlugDefaultMax =
  typeof process !== "undefined" && process.env.NODE_ENV === "production" ? 30 : 2000;

/** Окно и лимит для POST /api/pay/[slug] по IP (антифрод). В dev по умолчанию мягче; в prod — 60 без env. */
export const PAY_RATE_LIMIT_IP = {
  windowMs: 15 * 60 * 1000,
  maxRequests:
    typeof process !== "undefined" && process.env.PAY_RATE_LIMIT_IP_MAX !== undefined && process.env.PAY_RATE_LIMIT_IP_MAX !== ""
    ? Math.max(10, parseInt(process.env.PAY_RATE_LIMIT_IP_MAX, 10) || 60)
    : payIpDefaultMax,
  keyPrefix: "pay-ip",
} as const;

/** Окно и лимит для POST /api/pay/[slug] по slug. В prod по умолчанию 30 без env. */
export const PAY_RATE_LIMIT_SLUG = {
  windowMs: 15 * 60 * 1000,
  maxRequests:
    typeof process !== "undefined" && process.env.PAY_RATE_LIMIT_SLUG_MAX !== undefined && process.env.PAY_RATE_LIMIT_SLUG_MAX !== ""
    ? Math.max(10, parseInt(process.env.PAY_RATE_LIMIT_SLUG_MAX, 10) || 30)
    : paySlugDefaultMax,
  keyPrefix: "pay-slug",
} as const;

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

function checkRateLimitMemory(
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

async function checkRateLimitWithRedis(
  fullKey: string,
  windowMs: number,
  maxRequests: number,
): Promise<RateLimitResult> {
  return checkRateLimitRedis(fullKey, windowMs, maxRequests);
}

/** Временно отключает все лимиты из `checkRateLimitByIP` (миграция IP, отладка). Не держите в проде без необходимости. */
function isIpRateLimitDisabled(): boolean {
  const v = process.env.DISABLE_IP_RATE_LIMIT;
  return v === "true" || v === "1";
}

/**
 * Проверяет rate limit по IP (async: при REDIS_URL используется Redis).
 */
export async function checkRateLimitByIP(
  ip: string,
  options?: RateLimitOptions,
): Promise<RateLimitResult> {
  const resolved = resolveOptions(options);
  if (isIpRateLimitDisabled()) {
    return { allowed: true, remaining: resolved.maxRequests, resetAt: Date.now() + resolved.windowMs };
  }
  const key = buildKey(resolved.keyPrefix, ip);

  if (getRedisUrl()) {
    return checkRateLimitWithRedis(key, resolved.windowMs, resolved.maxRequests);
  }
  return checkRateLimitMemory(ipStore, key, resolved.windowMs, resolved.maxRequests);
}

/**
 * Проверяет rate limit по произвольному ключу (например slug).
 */
export async function checkRateLimitByKey(
  key: string,
  options: RateLimitOptions & { keyPrefix: string },
): Promise<RateLimitResult> {
  const resolved = resolveOptions(options);
  const fullKey = buildKey(resolved.keyPrefix, key);

  if (getRedisUrl()) {
    return checkRateLimitWithRedis(fullKey, resolved.windowMs, resolved.maxRequests);
  }
  return checkRateLimitMemory(
    genericStore,
    fullKey,
    resolved.windowMs,
    resolved.maxRequests,
  );
}

/**
 * Получает IP адрес из request.
 * Если TRUST_PROXY=true|1 — доверенные заголовки от прокси/CDN (иначе клиент может подделать их при прямом доступе к origin).
 * Порядок: cf-connecting-ip, true-client-ip, x-forwarded-for (первый хоп), x-real-ip.
 * Без TRUST_PROXY — только request.ip (платформа), без клиентских заголовков.
 */
export function getClientIP(request: NextRequest): string {
  const trustProxy = process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1";
  const trustProxyStrict = process.env.TRUST_PROXY_STRICT === "true" || process.env.TRUST_PROXY_STRICT === "1";
  if (trustProxy) {
    const cf = request.headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf;
    const trueClient = request.headers.get("true-client-ip")?.trim();
    if (trueClient) return trueClient;
    if (!trustProxyStrict) {
      const forwarded = request.headers.get("x-forwarded-for");
      if (forwarded) return forwarded.split(",")[0]!.trim();
    }
    const realIP = request.headers.get("x-real-ip")?.trim();
    if (realIP) return realIP;
  }
  const req = request as NextRequest & { ip?: string };
  if (typeof req.ip === "string" && req.ip) return req.ip;
  return "unknown";
}

/**
 * IP для логов и ключ для rate limit за один проход по заголовкам.
 * При неизвестном IP ключ = unknown + хеш User-Agent (не один общий bucket).
 */
export function getClientIpAndRateLimitKey(request: NextRequest): { ip: string; rateLimitKey: string } {
  const ip = getClientIP(request);
  if (ip !== "unknown") return { ip, rateLimitKey: ip };
  const ua = request.headers.get("user-agent") ?? "";
  const suffix = createHash("sha256").update(ua, "utf8").digest("hex").slice(0, 16);
  return { ip, rateLimitKey: `unknown:${suffix}` };
}

/** Только ключ для лимита (когда IP для логов не нужен). */
export function getRateLimitIpKey(request: NextRequest): string {
  return getClientIpAndRateLimitKey(request).rateLimitKey;
}

/**
 * Очищает истёкшие записи in-memory store.
 * Вызывается периодически из instrumentation (при отсутствии Redis).
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of ipStore.entries()) {
    if (now > entry.resetAt) ipStore.delete(key);
  }
  for (const [key, entry] of userIdStore.entries()) {
    if (now > entry.resetAt) userIdStore.delete(key);
  }
  for (const [key, entry] of genericStore.entries()) {
    if (now > entry.resetAt) genericStore.delete(key);
  }
  cleanupWrongPasswordAttemptsExpired();
}

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 минут
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Запускает периодическую очистку in-memory rate limit (при отсутствии Redis).
 * Вызывается из instrumentation.ts при старте сервера.
 */
export function startRateLimitCleanup(): void {
  if (getRedisUrl()) return;
  if (cleanupIntervalId != null) return;
  cleanupIntervalId = setInterval(() => {
    cleanupExpiredEntries();
  }, CLEANUP_INTERVAL_MS);
}
