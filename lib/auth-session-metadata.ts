import type { NextRequest } from "next/server";
import { truncateUserAgent } from "@/lib/user-agent-device-label";

export type NewSessionMetadata = {
  deviceInfo: string;
};

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
