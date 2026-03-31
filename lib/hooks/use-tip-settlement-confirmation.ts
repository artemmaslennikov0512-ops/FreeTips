"use client";

import { useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/security/csrf-client";

export type TipSettlementPhase = "idle" | "verifying" | "success" | "fail" | "slow";

const POLL_MS = 2000;
const MAX_ATTEMPTS = 45;

/**
 * После редиректа с Paygine в URL приходит outcome=success, хотя в БД транзакция
 * может ещё быть PENDING (вебхук, перелив SD). Опрашиваем статус до SUCCESS/FAILED.
 */
export function useTipSettlementConfirmation(
  tid: string | null,
  urlOutcome: "success" | "fail" | null,
): TipSettlementPhase {
  const [phase, setPhase] = useState<TipSettlementPhase>(() => {
    if (!tid || !urlOutcome) return "idle";
    if (urlOutcome === "fail") return "fail";
    return "verifying";
  });

  useEffect(() => {
    if (!tid || !urlOutcome) {
      const t = window.setTimeout(() => setPhase("idle"), 0);
      return () => clearTimeout(t);
    }
    if (urlOutcome === "fail") {
      const t = window.setTimeout(() => setPhase("fail"), 0);
      return () => clearTimeout(t);
    }

    const tVerify = window.setTimeout(() => setPhase("verifying"), 0);
    let cancelled = false;

    const run = async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS && !cancelled; attempt++) {
        try {
          const res = await fetch("/api/pay/sync-transaction", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getCsrfHeader() },
            body: JSON.stringify({ tid }),
            cache: "no-store",
            credentials: "same-origin",
          });
          if (cancelled) return;
          if (res.status === 404) {
            setPhase("fail");
            return;
          }
          if (!res.ok) {
            await new Promise((r) => setTimeout(r, POLL_MS));
            continue;
          }
          const data = (await res.json()) as { status?: string };
          const st = data.status;
          if (st === "SUCCESS") {
            setPhase("success");
            return;
          }
          if (st === "FAILED" || st === "CANCELLED") {
            setPhase("fail");
            return;
          }
        } catch {
          /* сеть — повтор */
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      if (!cancelled) setPhase("slow");
    };

    void run();
    return () => {
      cancelled = true;
      clearTimeout(tVerify);
    };
  }, [tid, urlOutcome]);

  return phase;
}
