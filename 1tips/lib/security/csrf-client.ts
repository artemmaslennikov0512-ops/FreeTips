import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/security/csrf";

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|; )${escaped}=([^;]*)`);
  const match = document.cookie.match(pattern);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getCsrfHeader(): Record<string, string> {
  const token = readCookieValue(CSRF_COOKIE_NAME);
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}
