/**
 * Очередь переливов Paygine (после вебхука): ограничивает параллельные вызовы к ПЦ.
 * С REDIS_URL — список в Redis + глобальный семафор между инстансами (общий клиент — lib/redis-shared).
 * Без Redis — очередь и лимит только внутри процесса Node.
 */

import { getPaygineRelocateQueueConcurrency } from "@/lib/config";
import { messageFromUnknown } from "@/lib/errors";
import { logInfo } from "@/lib/logger";
import { getSharedIoredis } from "@/lib/redis-shared";

const QUEUE_KEY = "1tips:relocate:queue";
const GLOBAL_SLOTS_KEY = "1tips:relocate:global_slots";

type Pending = { resolve: () => void; reject: (e: Error) => void };
const pendingWaits = new Map<string, Pending>();

const memoryQueue: string[] = [];

async function enqueueRelocate(txId: string): Promise<void> {
  const trimmed = txId.trim();
  if (!trimmed) return;
  const r = await getSharedIoredis();
  if (r) {
    try {
      await r.rpush(QUEUE_KEY, trimmed);
      return;
    } catch {
      /* Redis недоступен — память */
    }
  }
  memoryQueue.push(trimmed);
}

async function dequeueRelocate(): Promise<string | null> {
  const r = await getSharedIoredis();
  if (r) {
    try {
      const id = await r.lpop(QUEUE_KEY);
      if (id) return id;
    } catch {
      /* fall through to memory */
    }
  }
  return memoryQueue.shift() ?? null;
}

/** Завершает ожидание runRelocateQueued или no-op, если вебхук без ожидания. */
function completeRelocateJob(txId: string, error?: unknown): void {
  const w = pendingWaits.get(txId);
  if (!w) return;
  pendingWaits.delete(txId);
  if (error !== undefined) {
    w.reject(error instanceof Error ? error : new Error(String(error)));
  } else {
    w.resolve();
  }
}

function backoffMs(): number {
  return 40 + Math.floor(Math.random() * 80);
}

async function withGlobalConcurrencySlot<T>(fn: () => Promise<T>): Promise<T> {
  const cap = getPaygineRelocateQueueConcurrency();
  const r = await getSharedIoredis();
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
        completeRelocateJob(id);
      } catch (e) {
        logInfo("payment.relocate.queue_job_error", {
          transactionId: id,
          error: messageFromUnknown(e),
        });
        completeRelocateJob(id, e);
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
            error: messageFromUnknown(e),
          });
        }
      }
    })
    .catch((e) => {
      logInfo("payment.relocate.queue_drain_fatal", {
        error: messageFromUnknown(e),
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
 * При выбросе исключения из перелива — Promise отклоняется.
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
