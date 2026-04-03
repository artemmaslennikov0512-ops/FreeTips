import { describeSessionDevice } from "@/lib/user-agent-device-label";

export type SessionRowForList = {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  deviceInfo: string | null;
  refreshToken: string;
};

export type ProfileSessionListItem = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  /** Тип устройства и ОС (из User-Agent) */
  platformLabel: string;
  /** Браузер и мажорная версия */
  browserLabel: string | null;
  /** Первые 8 hex-символов UUID браузера (если клиент прислал deviceClientId при входе) */
  deviceClientIdPreview: string | null;
  isCurrent: boolean;
};

export function parseStoredDeviceInfo(raw: string | null): {
  ip: string | null;
  userAgent: string | null;
  deviceClientId: string | null;
} {
  if (!raw) return { ip: null, userAgent: null, deviceClientId: null };
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    return {
      ip: typeof o.ip === "string" ? o.ip : null,
      userAgent: typeof o.userAgent === "string" ? o.userAgent : null,
      deviceClientId: typeof o.deviceClientId === "string" ? o.deviceClientId : null,
    };
  } catch {
    return { ip: null, userAgent: null, deviceClientId: null };
  }
}

function formatDeviceClientIdPreview(id: string | null): string | null {
  if (!id?.trim()) return null;
  const hex = id.replace(/-/g, "");
  return hex.length >= 8 ? hex.slice(0, 8).toLowerCase() : null;
}

export function toProfileSessionListItem(
  row: SessionRowForList,
  currentRefreshToken: string | null,
): ProfileSessionListItem {
  const { userAgent, deviceClientId } = parseStoredDeviceInfo(row.deviceInfo);
  const { platformLabel, browserLabel } = describeSessionDevice(userAgent ?? "");
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    platformLabel,
    browserLabel,
    deviceClientIdPreview: formatDeviceClientIdPreview(deviceClientId),
    isCurrent: Boolean(currentRefreshToken && row.refreshToken === currentRefreshToken),
  };
}
