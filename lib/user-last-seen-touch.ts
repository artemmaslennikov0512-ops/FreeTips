/**
 * Обновление lastSeenAt с троттлингом и очередью:
 * - один параллельный touch на userId (дубликаты ждут тот же Promise);
 * - глобальный лимит одновременных updateMany, чтобы при всплеске разных ЛК не бить БД пачкой.
 */

import { db } from "@/lib/db";
import { LK_PRESENCE_WINDOW_MS } from "@/lib/lk-presence";

/** Сколько одновременных записей lastSeenAt по разным пользователям (остальные ждут очереди). */
const MAX_CONCURRENT_LAST_SEEN_TOUCHES = 25;

let concurrentTouches = 0;
const concurrencyWaitQueue: Array<() => void> = [];

function acquireConcurrencySlot(): Promise<void> {
  if (concurrentTouches < MAX_CONCURRENT_LAST_SEEN_TOUCHES) {
    concurrentTouches++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    concurrencyWaitQueue.push(() => {
      concurrentTouches++;
      resolve();
    });
  });
}

function releaseConcurrencySlot(): void {
  concurrentTouches--;
  const next = concurrencyWaitQueue.shift();
  if (next) next();
}

const inflightByUser = new Map<string, Promise<boolean>>();

async function runTouchDb(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - LK_PRESENCE_WINDOW_MS);
  const now = new Date();
  const result = await db.user.updateMany({
    where: {
      id: userId,
      OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: since } }],
    },
    data: { lastSeenAt: now },
  });
  return result.count > 0;
}

/**
 * Продлевает lastSeenAt, если прошло ≥ LK_PRESENCE_WINDOW_MS с прошлой записи.
 * @returns true если была запись в БД
 */
export async function touchUserLastSeenThrottled(userId: string): Promise<boolean> {
  const existing = inflightByUser.get(userId);
  if (existing) return existing;

  const promise = (async () => {
    await acquireConcurrencySlot();
    try {
      return await runTouchDb(userId);
    } finally {
      releaseConcurrencySlot();
    }
  })().finally(() => {
    inflightByUser.delete(userId);
  });

  inflightByUser.set(userId, promise);
  return promise;
}
