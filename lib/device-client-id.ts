/**
 * Стабильный идентификатор «браузера/профиля» для привязки сессий (не аппаратный ID).
 * Хранится в localStorage; при очистке данных сайта создаётся новый.
 */

const STORAGE_KEY = "ft_device_client_v1";

function isUuidV4(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s.trim(),
  );
}

export function getOrCreateDeviceClientId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(STORAGE_KEY)?.trim();
    if (existing && isUuidV4(existing)) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return "";
  }
}
