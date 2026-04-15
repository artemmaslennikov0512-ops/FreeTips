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
  if (m === "GET" || m === "HEAD") return headers;
  return { ...getCsrfHeader(), ...headers };
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
  const baseHeaders = withDeviceClientHeader({
    ...authHeaders(),
    ...(init?.headers as Record<string, string> | undefined),
  });
  const headersWithCsrf = withCsrfForMutating(method, baseHeaders);
  let res = await fetch(url, {
    ...init,
    method,
    credentials: init?.credentials ?? "include",
    headers: headersWithCsrf,
  });
  if (res.status === 401) {
    if (typeof window !== "undefined" && isCabinetImpersonating()) {
      const { returnPath } = drainImpersonationState();
      window.location.assign(returnPath ?? "/admin/dashboard");
      return res;
    }
    const refreshRes = await postSessionRefresh();
    if (refreshRes.ok) {
      res = await fetch(url, {
        ...init,
        method,
        credentials: init?.credentials ?? "include",
        headers: withCsrfForMutating(method, withDeviceClientHeader({
          ...authHeaders(),
          ...(init?.headers as Record<string, string> | undefined),
        })),
      });
    }
  }
  return res;
}
