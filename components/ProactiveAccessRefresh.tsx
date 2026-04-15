"use client";

import { useEffect } from "react";
import { ACCESS_PROACTIVE_REFRESH_INTERVAL_MS, proactiveRefreshAccessToken } from "@/lib/auth-client";

/**
 * Продлевает access JWT по refresh-cookie до истечения 15m access (см. lib/auth/jwt.ts).
 */
export function ProactiveAccessRefresh() {
  useEffect(() => {
    const id = window.setInterval(() => {
      void proactiveRefreshAccessToken();
    }, ACCESS_PROACTIVE_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
  return null;
}
