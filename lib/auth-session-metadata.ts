import type { NextRequest } from "next/server";
import { lookupIpGeoQuick } from "@/lib/ip-geo-lookup";
import { truncateUserAgent } from "@/lib/user-agent-device-label";

export type NewSessionMetadata = {
  deviceInfo: string;
  geoCountry: string | null;
  geoCity: string | null;
};

/**
 * Метаданные для строки Session при логине/регистрации (IP, UA, гео по IP).
 */
export async function buildNewSessionMetadata(
  request: NextRequest,
  ip: string,
): Promise<NewSessionMetadata> {
  const ua = truncateUserAgent(request.headers.get("user-agent"));
  const geo = await lookupIpGeoQuick(ip, 1200);
  return {
    deviceInfo: JSON.stringify({ ip, userAgent: ua }),
    geoCountry: geo?.country ?? null,
    geoCity: geo?.city ?? null,
  };
}
