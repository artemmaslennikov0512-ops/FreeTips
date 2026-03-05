/**
 * Базовый URL сайта для формирования ссылок и QR.
 *
 * 0.0.0.0 в браузере не открывается — заменяем на localhost.
 */

/** Хосты, с которыми браузер не может открыть ссылку (адреса биндинга сервера). */
const UNUSABLE_HOSTS = ["0.0.0.0", "::"];

/**
 * Возвращает origin, пригодный для перехода из браузера.
 * 0.0.0.0 и :: заменяются на localhost.
 */
export function toClientOrigin(origin: string): string {
  try {
    const u = new URL(origin);
    if (UNUSABLE_HOSTS.includes(u.hostname)) {
      u.hostname = "localhost";
      return u.origin;
    }
    return origin;
  } catch {
    return origin;
  }
}

/**
 * Базовый URL для формирования ссылок. Вызывать в браузере (client-компоненты после mount).
 * NEXT_PUBLIC_APP_URL задаёт явный URL; иначе берётся window.location.origin с заменой 0.0.0.0 → localhost.
 */
export function getBaseUrl(): string {
  if (typeof window === "undefined") return "";
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && typeof env === "string") {
    return env.replace(/\/$/, "");
  }
  return toClientOrigin(window.location.origin);
}

/**
 * Базовый URL на сервере (API routes). Использует NEXT_PUBLIC_APP_URL или origin из request.
 * Нормализует 0.0.0.0 → localhost, чтобы ссылки открывались в браузере.
 * В production без NEXT_PUBLIC_APP_URL не используем origin (защита от open redirect при подмене Host).
 */
export function getBaseUrlFromRequest(origin: string): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && typeof env === "string") {
    return env.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return "";
  }
  return toClientOrigin(origin);
}
