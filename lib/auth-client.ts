/**
 * Клиентские хелперы для авторизованных запросов.
 * Access JWT — httpOnly-cookie `ft_access` (не в JS); при просмотре чужого ЛК — Bearer в sessionStorage.
 */

import { getOrCreateDeviceClientId } from "@/lib/device-client-id";
import { DEVICE_CLIENT_ID_HEADER } from "@/lib/auth-session-metadata";
import {
  IMPERSONATION_TARGET_BEARER_KEY,
  isCabinetImpersonating,
  drainImpersonationState,
  getImpersonationTargetBearer,
} from "@/lib/cabinet-impersonation-state";
import { clearCabinetNavRoleCache } from "@/lib/cabinet-nav-role-cache";
import { getCsrfHeader } from "@/lib/security/csrf-client";

const LEGACY_ACCESS_TOKEN_LS = "accessToken";

function withDeviceClientHeader(headers: Record<string, string>): Record<string, string> {
  const id = getOrCreateDeviceClientId();
  if (!id) return headers;
  return { ...headers, [DEVICE_CLIENT_ID_HEADER]: id };
}

function withCsrfForMutating(method: string, headers: Record<string, string>): Record<string, string> {
  const m = (method || "GET").toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return headers;
  return { ...getCsrfHeader(), ...headers };
}

const JSON_MEDIA_TYPE = "application/json";

/**
 * В proxy.ts для POST/PUT/… без Bearer проверяется CSRF и `Content-Type: application/json`.
 * Cookie-сессия: подставляем JSON и пустое тело `{}`, если клиент не передал тело (heartbeat, TOTP start и т.д.).
 * FormData / multipart не трогаем.
 */
function mergeInitForProxyJsonRule(
  method: string,
  init: RequestInit | undefined,
  headersRecord: Record<string, string>,
): RequestInit {
  const m = (method || "GET").toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") {
    return { ...init, method, headers: headersRecord };
  }
  if (getAccessToken()) {
    return { ...init, method, headers: headersRecord };
  }
  const body = init?.body;
  if (body instanceof FormData) {
    return { ...init, method, headers: headersRecord };
  }
  const h = new Headers(headersRecord as HeadersInit);
  const ct = h.get("Content-Type") ?? h.get("content-type");
  if (ct?.toLowerCase().includes("multipart/")) {
    return { ...init, method, headers: headersRecord };
  }
  if (!ct?.toLowerCase().startsWith(JSON_MEDIA_TYPE)) {
    h.set("Content-Type", JSON_MEDIA_TYPE);
  }
  const outHeaders: Record<string, string> = {};
  h.forEach((v, k) => {
    outHeaders[k] = v;
  });
  const next: RequestInit = { ...init, method, headers: outHeaders };
  if (body === undefined) {
    next.body = "{}";
  }
  return next;
}

/** Обновление access+refresh по httpOnly refresh-cookie; требует CSRF (см. POST /api/auth/refresh). */
function postSessionRefresh(): Promise<Response> {
  return fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
    headers: withDeviceClientHeader({
      "Content-Type": "application/json",
      ...getCsrfHeader(),
    }),
    body: "{}",
  });
}

/** Устаревший ключ localStorage; миграция — attach-access-cookie. */
function getLegacyAccessTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LEGACY_ACCESS_TOKEN_LS);
  } catch {
    return null;
  }
}

/**
 * «Есть ли что отправить в Authorization» — только режим impersonation (Bearer цели).
 * Наличие httpOnly-сессии из JS не видно.
 */
export function getAccessToken(): string | null {
  return getImpersonationTargetBearer();
}

export function authHeaders(): Record<string, string> {
  const imp = getImpersonationTargetBearer();
  return imp ? { Authorization: `Bearer ${imp}` } : {};
}

/** Одноразово: перенос JWT из старого localStorage в httpOnly-cookie. */
export async function migrateLegacyAccessTokenToCookie(): Promise<void> {
  if (typeof window === "undefined") return;
  const legacy = getLegacyAccessTokenFromStorage();
  if (!legacy) return;
  try {
    const res = await fetch("/api/auth/attach-access-cookie", {
      method: "POST",
      credentials: "include",
      headers: withDeviceClientHeader({
        Authorization: `Bearer ${legacy}`,
        "Content-Type": "application/json",
        ...getCsrfHeader(),
      }),
      body: "{}",
    });
    if (res.ok || res.status === 401) {
      try {
        localStorage.removeItem(LEGACY_ACCESS_TOKEN_LS);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_LS);
    sessionStorage.removeItem(IMPERSONATION_TARGET_BEARER_KEY);
  } catch {
    /* ignore */
  }
  clearCabinetNavRoleCache();
}

/** Интервал фонового refresh: меньше срока access (15m), см. lib/auth/jwt.ts */
export const ACCESS_PROACTIVE_REFRESH_INTERVAL_MS = 7 * 60 * 1000;

export async function proactiveRefreshAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isCabinetImpersonating()) return false;
  const refreshRes = await postSessionRefresh();
  return refreshRes.ok;
}

/**
 * Выполняет fetch с cookie-сессией и/или Bearer impersonation. При 401 — refresh по cookie, один повтор.
 */
export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method ?? "GET";
  const runFetch = () => {
    const headersWithCsrf = withCsrfForMutating(
      method,
      withDeviceClientHeader({
        ...authHeaders(),
        ...(init?.headers as Record<string, string> | undefined),
      }),
    );
    const merged = mergeInitForProxyJsonRule(method, init, headersWithCsrf);
    return fetch(url, {
      ...init,
      ...merged,
      credentials: init?.credentials ?? "include",
    });
  };

  let res = await runFetch();
  if (res.status === 401) {
    if (typeof window !== "undefined" && isCabinetImpersonating()) {
      const { returnPath } = drainImpersonationState();
      window.location.assign(returnPath ?? "/admin/dashboard");
      return res;
    }
    const refreshRes = await postSessionRefresh();
    if (refreshRes.ok) {
      res = await runFetch();
    }
  }
  return res;
}
