/**
 * Опциональное Redis-хранилище для rate limit.
 * Используется при наличии REDIS_URL; иначе — in-memory в rate-limit.ts.
 * Ключи: rl:{keyPrefix}:{identifier}, TTL = windowMs.
 */

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

interface RedisLike {
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<string>;
  pttl(key: string): Promise<number>;
  quit(): Promise<string>;
}

let redisClient: RedisLike | null = null;
let redisInitPromise: Promise<RedisLike | null> | null = null;

async function getRedis(): Promise<RedisLike | null> {
  let url: string;
  try {
    const { getRedisUrl } = await import("@/lib/config");
    url = getRedisUrl();
  } catch {
    url = process.env.REDIS_URL?.trim() ?? "";
  }
  if (!url?.trim()) return null;
  if (redisClient) return redisClient;
  if (redisInitPromise) return redisInitPromise;
  redisInitPromise = (async () => {
    try {
      const Redis = (await import("ioredis")).default;
      const client = new Redis(url, { maxRetriesPerRequest: 2 }) as unknown as RedisLike;
      redisClient = client;
      return client;
    } catch {
      return null;
    }
  })();
  return redisInitPromise;
}

/**
 * Проверка rate limit через Redis: INCR + EXPIRE при первом запросе в окне.
 */
export async function checkRateLimitRedis(
  fullKey: string,
  windowMs: number,
  maxRequests: number,
): Promise<RateLimitResult> {
  const redis = await getRedis();
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
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    redisInitPromise = null;
  }
}
