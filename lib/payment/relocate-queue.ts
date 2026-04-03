/**
 * Очередь переливов Paygine (после вебхука): ограничивает параллельные вызовы к ПЦ.
 * С REDIS_URL — список в Redis + глобальный семафор между инстансами.
 * Без Redis — очередь и лимит только внутри процесса Node.
 */

import { getPaygineRelocateQueueConcurrency, getRedisUrl } from "@/lib/config";
import { logInfo } from "@/lib/logger";

const QUEUE_KEY = "1tips:relocate:queue";
const GLOBAL_SLOTS_KEY = "1tips:relocate:global_slots";

type Pending = { resolve: () => void; reject: (e: Error) => void };
const pendingWaits = new Map<string, Pending>();

const memoryQueue: string[] = [];

let redisClient: import("ioredis").default | null = null;
let redisInit: Promise<import("ioredis").default | null> | null = null;

async function getQueueRedis(): Promise<import("ioredis").default | null> {
  if (!getRedisUrl().trim()) return null;
  if (redisClient) return redisClient;
  if (redisInit) return redisInit;
  redisInit = (async () => {
    try {
      const Redis = (await import("ioredis")).default;
      const url = getRedisUrl();
      redisClient = new Redis(url, { maxRetriesPerRequest: 2 });
      return redisClient;
    } catch {
      return null;
    }
  })();
  return redisInit;
}

async function enqueueRelocate(txId: string): Promise<void> {
  const trimmed = txId.trim();
  if (!trimmed) return;
  const r = await getQueueRedis();
  if (r) {
    try {
      await r.rpush(QUEUE_KEY, trimmed);
    } catch {
      memoryQueue.push(trimmed);
    }
  } else {
    memoryQueue.push(trimmed);
  }
}

async function dequeueRelocate(): Promise<string | null> {
  const r = await getQueueRedis();
  if (r) {
    try {
      const id = await r.lpop(QUEUE_KEY);
      if (id) return id;
    } catch {
      /* fall through */
    }
  }
  return memoryQueue.shift() ?? null;
}

function settlePending(txId: string): void {
  const w = pendingWaits.get(txId);
  if (!w) return;
  pendingWaits.delete(txId);
  w.resolve();
}

function backoffMs(): number {
  return 40 + Math.floor(Math.random() * 80);
}

async function withGlobalConcurrencySlot<T>(fn: () => Promise<T>): Promise<T> {
  const cap = getPaygineRelocateQueueConcurrency();
  const r = await getQueueRedis();
  if (!r) {
    return fn();
  }
  for (;;) {
    const v = await r.incr(GLOBAL_SLOTS_KEY);
    if (v <= cap) {
      try {
        return await fn();
      } finally {
        await r.decr(GLOBAL_SLOTS_KEY);
      }
    }
    await r.decr(GLOBAL_SLOTS_KEY);
    await new Promise<void>((res) => setTimeout(res, backoffMs()));
  }
}

async function relocateWorker(): Promise<void> {
  for (;;) {
    const id = await dequeueRelocate();
    if (!id) return;
    await withGlobalConcurrencySlot(async () => {
      try {
        const { runRelocateForTransaction } = await import("./paygine-gateway");
        await runRelocateForTransaction(id);
      } catch (e) {
        logInfo("payment.relocate.queue_job_error", {
          transactionId: id,
          error: e instanceof Error ? e.message : String(e),
        });
      } finally {
        settlePending(id);
      }
    });
  }
}

async function executeDrain(): Promise<void> {
  const n = getPaygineRelocateQueueConcurrency();
  await Promise.all(Array.from({ length: n }, () => relocateWorker()));
}

let drainTail: Promise<void> = Promise.resolve();
let rescheduleAfterDrain = false;

function kickDrain(): void {
  rescheduleAfterDrain = true;
  drainTail = drainTail
    .then(async () => {
      while (rescheduleAfterDrain) {
        rescheduleAfterDrain = false;
        try {
          await executeDrain();
        } catch (e) {
          logInfo("payment.relocate.queue_drain_error", {
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    })
    .catch((e) => {
      logInfo("payment.relocate.queue_drain_fatal", {
        error: e instanceof Error ? e.message : String(e),
      });
    });
}

/**
 * Поставить перелив в очередь (вебхук). Не блокирует ответ HTTP.
 */
export function scheduleRelocate(txId: string): void {
  void enqueueRelocate(txId).then(() => kickDrain());
}

/**
 * Очередь + ожидание завершения (cron/sync). Разделяет лимит параллелизма с вебхуками.
 */
export function runRelocateQueued(txId: string): Promise<void> {
  const trimmed = txId.trim();
  if (!trimmed) return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (pendingWaits.has(trimmed)) {
      reject(new Error(`runRelocateQueued: уже ожидается ${trimmed}`));
      return;
    }
    pendingWaits.set(trimmed, { resolve, reject });
    void enqueueRelocate(trimmed)
      .then(() => kickDrain())
      .catch((e) => {
        pendingWaits.delete(trimmed);
        reject(e instanceof Error ? e : new Error(String(e)));
      });
  });
}
