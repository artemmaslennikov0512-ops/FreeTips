/**
 * Уведомление WebSocket-клиентов о зачислении баланса.
 * Вызывает внутренний эндпоинт прокси-сервера (proxy-ws-server).
 */

const BROADCAST_URL = "http://127.0.0.1:3000/internal/broadcast";
const BROADCAST_TIMEOUT_MS = 1500;

export async function broadcastBalanceUpdated(userId: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BROADCAST_TIMEOUT_MS);
  try {
    await fetch(BROADCAST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
      signal: controller.signal,
    });
  } catch {
    // Прокси может быть недоступен (например, при локальном dev без proxy)
  } finally {
    clearTimeout(timeout);
  }
}
