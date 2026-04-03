"use client";

import { useEffect, useRef } from "react";
import { fetchWithAuth, getAccessToken } from "@/lib/auth-client";
import { getCsrfHeader } from "@/lib/security/csrf-client";

/**
 * Однократный пинг при заходе на ЛК и при возврате на вкладку (видимость).
 * Интервала нет: «в ЛК» в админке продлевается только реальными запросами с JWT
 * или этими событиями; пока открыта страница без действий — после окна lastSeenAt
 * пользователь станет «не в ЛК» (см. lib/lk-presence.ts).
 */
export function LkPresenceHeartbeat() {
  const inFlight = useRef(false);

  useEffect(() => {
    const send = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (!getAccessToken()) return;
      if (inFlight.current) return;
      inFlight.current = true;
      void fetchWithAuth("/api/profile/heartbeat", {
        method: "POST",
        headers: { ...getCsrfHeader() },
      }).finally(() => {
        inFlight.current = false;
      });
    };

    send();
    const onVis = () => {
      if (document.visibilityState === "visible") send();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return null;
}
