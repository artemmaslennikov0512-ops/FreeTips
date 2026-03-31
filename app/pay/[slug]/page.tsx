import { logInfo } from "@/lib/logger";
import { syncTipTransactionFromPaygine } from "@/lib/payment/sync-tip-from-paygine";
import PayPageClient from "./PayPageClient";

/** Как в POST /api/pay/sync-transaction — tid из query сложно угадать. */
const TID_RE = /^[a-z0-9]{20,40}$/i;

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tidRaw = typeof sp.tid === "string" ? sp.tid.trim() : "";
  const outcomeRaw = typeof sp.outcome === "string" ? sp.outcome : "";

  if (outcomeRaw === "success" && tidRaw && TID_RE.test(tidRaw)) {
    logInfo("payment.sync_paygine.server_return", { transactionId: tidRaw });
    const r = await syncTipTransactionFromPaygine(tidRaw);
    logInfo("payment.sync_paygine.server_return_done", {
      transactionId: tidRaw,
      synced: r.ok,
      dbStatus: r.status,
      paygineOrderState: r.paygineOrderState ?? null,
      error: r.error ?? null,
    });
  }

  return <PayPageClient />;
}
