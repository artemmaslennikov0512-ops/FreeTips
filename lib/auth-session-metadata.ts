import type { NextRequest } from "next/server";
import { truncateUserAgent } from "@/lib/user-agent-device-label";
import { normalizeDeviceClientId } from "@/lib/device-client-id";

export type NewSessionMetadata = {
  deviceInfo: string;
};

/** Клиент шлёт стабильный UUID профиля браузера (см. `getOrCreateDeviceClientId`). */
export const DEVICE_CLIENT_ID_HEADER = "x-device-client-id";

/**
 * Метаданные для строки Session при логине/регистрации (IP, UA, опц. client device UUID).
 */
export function buildNewSessionMetadata(
  request: NextRequest,
  ip: string,
  deviceClientId?: string | undefined,
): NewSessionMetadata {
  const ua = truncateUserAgent(request.headers.get("user-agent"));
  const payload: Record<string, string> = { ip, userAgent: ua };
  if (deviceClientId) payload.deviceClientId = deviceClientId;
  return {
    deviceInfo: JSON.stringify(payload),
  };
}

/**
 * Обновляет IP/UA (и при необходимости deviceClientId) при refresh и пульсе сессии;
 * сохраняет прочие поля JSON (например totp: true).
 */
export function mergeSessionDeviceInfo(
  existingRaw: string | null,
  request: NextRequest,
  ip: string,
  deviceClientId?: string | null,
): string {
  let base: Record<string, unknown> = {};
  try {
    if (existingRaw) base = JSON.parse(existingRaw) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  const ua = truncateUserAgent(request.headers.get("user-agent"));
  const next: Record<string, unknown> = { ...base, ip, userAgent: ua };
  const id = deviceClientId?.trim();
  if (id) next.deviceClientId = id;
  return JSON.stringify(next);
}

export function readDeviceClientIdFromRequest(request: NextRequest): string | null {
  return normalizeDeviceClientId(request.headers.get(DEVICE_CLIENT_ID_HEADER));
}
