/**
 * Счётчик неверных паролей по userId (in-memory). Сигнал антифрода — не с первой ошибки.
 * При нескольких инстансах без Redis счётчики не общие; логи и rate limit по IP остаются.
 */

const WINDOW_MS = 30 * 60 * 1000;

/** Сколько неверных паролей подряд в окне нужно, чтобы записать fraud signal */
export const WRONG_PASSWORD_ATTEMPTS_BEFORE_SIGNAL = 5;

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

export function recordWrongPasswordAttempt(userId: string): number {
  const now = Date.now();
  const e = store.get(userId);
  if (!e || now > e.resetAt) {
    store.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return 1;
  }
  e.count += 1;
  return e.count;
}

export function clearWrongPasswordAttempts(userId: string): void {
  store.delete(userId);
}

export function cleanupWrongPasswordAttemptsExpired(): void {
  const now = Date.now();
  for (const [id, e] of store.entries()) {
    if (now > e.resetAt) store.delete(id);
  }
}
