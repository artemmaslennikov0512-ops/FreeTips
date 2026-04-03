/**
 * Опциональное Redis-хранилище для rate limit.
 * Используется при наличии REDIS_URL; иначе — in-memory в rate-limit.ts.
 * Ключи: rl:{keyPrefix}:{identifier}, TTL = windowMs.
 */

import { closeSharedRedis, getSharedIoredis } from "@/lib/redis-shared";

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

/**
 * Проверка rate limit через Redis: INCR + EXPIRE при первом запросе в окне.
 */
export async function checkRateLimitRedis(
  fullKey: string,
  windowMs: number,
  maxRequests: number,
): Promise<RateLimitResult> {
  const redis = await getSharedIoredis();
  if (!redis) return { allowed: true, remaining: maxRequests - 1, resetAt: Date.now() + windowMs };

  const key = `rl:${fullKey}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.pexpire(key, windowMs);
    const ttlMs = await redis.pttl(key);
    const resetAt = Date.now() + (ttlMs > 0 ? ttlMs : windowMs);
    const remaining = Math.max(0, maxRequests - count);
    const allowed = count <= maxRequests;
    return { allowed, remaining, resetAt };
  } catch {
    return { allowed: true, remaining: maxRequests - 1, resetAt: Date.now() + windowMs };
  }
}

export async function closeRedis(): Promise<void> {
  await closeSharedRedis();
}
