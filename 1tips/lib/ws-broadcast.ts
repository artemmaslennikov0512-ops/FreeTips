/**
 * Уведомление WebSocket-клиентов о зачислении баланса.
 * Вызывает внутренний эндпоинт прокси-сервера (proxy-ws-server).
 */

const BROADCAST_URL = "http://127.0.0.1:3000/internal/broadcast";

export async function broadcastBalanceUpdated(userId: string): Promise<void> {
  try {
    await fetch(BROADCAST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  } catch {
    // Прокси может быть недоступен (например, при локальном dev без proxy)
  }
}
