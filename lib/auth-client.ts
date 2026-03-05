/**
 * Клиентские хелперы для авторизованных запросов (Bearer token из localStorage).
 * Один источник правды для ключа и заголовка — меньше дублирования и проще смена схемы.
 */

const ACCESS_TOKEN_KEY = "accessToken";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** Заголовки для fetch с Bearer-токеном. Возвращает {} если токена нет. */
export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clearAccessToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(ACCESS_TOKEN_KEY);
}
