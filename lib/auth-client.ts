/**
 * Клиентские хелперы для авторизованных запросов (Bearer token из localStorage).
 * Один источник правды для ключа и заголовка — меньше дублирования и проще смена схемы.
 */

import { getOrCreateDeviceClientId } from "@/lib/device-client-id";
import { DEVICE_CLIENT_ID_HEADER } from "@/lib/auth-session-metadata";

const ACCESS_TOKEN_KEY = "accessToken";

function withDeviceClientHeader(headers: Record<string, string>): Record<string, string> {
  const id = getOrCreateDeviceClientId();
  if (!id) return headers;
  return { ...headers, [DEVICE_CLIENT_ID_HEADER]: id };
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** Заголовки для fetch с Bearer-токеном. Возвращает {} если токена нет. */
export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function setAccessToken(token: string): void {
  if (typeof window !== "undefined") localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(ACCESS_TOKEN_KEY);
}

/**
 * Выполняет fetch с Bearer-токеном. При 401 пробует обновить токен через /api/auth/refresh
 * и повторяет запрос один раз. Редирект на логин делайте только если ответ по-прежнему 401/403.
 */
export async function fetchWithAuth(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const baseHeaders = withDeviceClientHeader({
    ...authHeaders(),
    ...(init?.headers as Record<string, string> | undefined),
  });
  let res = await fetch(url, { ...init, credentials: init?.credentials ?? "include", headers: baseHeaders });
  if (res.status === 401) {
    const refreshHeaders = withDeviceClientHeader({});
    const refreshRes = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: refreshHeaders,
    });
    if (refreshRes.ok) {
      const data = (await refreshRes.json()) as { accessToken?: string };
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        res = await fetch(url, {
          ...init,
          credentials: init?.credentials ?? "include",
          headers: withDeviceClientHeader({
            ...authHeaders(),
            ...(init?.headers as Record<string, string> | undefined),
          }),
        });
      }
    }
  }
  return res;
}
