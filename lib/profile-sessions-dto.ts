import { summarizeUserAgent } from "@/lib/user-agent-device-label";

export type SessionRowForList = {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  deviceInfo: string | null;
  geoCountry: string | null;
  geoCity: string | null;
  refreshToken: string;
};

export type ProfileSessionListItem = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ip: string | null;
  deviceLabel: string;
  locationLabel: string | null;
  isCurrent: boolean;
};

export function parseStoredDeviceInfo(raw: string | null): {
  ip: string | null;
  userAgent: string | null;
} {
  if (!raw) return { ip: null, userAgent: null };
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    return {
      ip: typeof o.ip === "string" ? o.ip : null,
      userAgent: typeof o.userAgent === "string" ? o.userAgent : null,
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

function formatLocation(city: string | null, country: string | null): string | null {
  const c = city?.trim() || "";
  const co = country?.trim() || "";
  if (c && co) return `${c}, ${co}`;
  if (co) return co;
  if (c) return c;
  return null;
}

export function toProfileSessionListItem(
  row: SessionRowForList,
  currentRefreshToken: string | null,
): ProfileSessionListItem {
  const { ip, userAgent } = parseStoredDeviceInfo(row.deviceInfo);
  const fromColumns = formatLocation(row.geoCity, row.geoCountry);
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    ip,
    deviceLabel: summarizeUserAgent(userAgent ?? ""),
    locationLabel: fromColumns,
    isCurrent: Boolean(currentRefreshToken && row.refreshToken === currentRefreshToken),
  };
}
