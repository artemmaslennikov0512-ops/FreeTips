/**
 * Один экземпляр ioredis на процесс при заданном REDIS_URL.
 * Используется rate limit, очередью переливов Paygine и др.
 */

import { getRedisUrl } from "@/lib/config";
import type Redis from "ioredis";

let client: Redis | null = null;
let initPromise: Promise<Redis | null> | null = null;

export async function getSharedIoredis(): Promise<Redis | null> {
  const url = getRedisUrl().trim();
  if (!url) return null;
  if (client) return client;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const IORedis = (await import("ioredis")).default;
      const instance = new IORedis(url, { maxRetriesPerRequest: 2 });
      client = instance;
      return instance;
    } catch {
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}

export async function closeSharedRedis(): Promise<void> {
  if (client) {
    try {
      await client.quit();
    } catch {
      /* ignore */
    }
    client = null;
  }
  initPromise = null;
}
