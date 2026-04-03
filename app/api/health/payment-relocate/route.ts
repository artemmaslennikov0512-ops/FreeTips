/**
 * GET /api/health/payment-relocate — метрики зависших claim relocate (без JWT).
 * MONITORING_SECRET + заголовок X-Monitoring-Secret. Смотрите ok и stuckRelocateClaimCount в JSON.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRelocateStuckMonitoring } from "@/lib/payment/relocate-stuck-queries";
import { RELOCATE_CLAIM_ALERT_AFTER_MS, RELOCATE_CLAIM_STALE_MS } from "@/lib/payment/relocate-constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STUCK_HINT =
  "Проверьте логи payment.relocate.* / payment.webhook.relocate_failed; при необходимости sync или scripts/utils/relocate-one-transaction.ts";

export async function GET(request: NextRequest) {
  const secret = process.env.MONITORING_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "MONITORING_SECRET не задан", disabled: true }, { status: 501 });
  }
  if (request.headers.get("x-monitoring-secret")?.trim() !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stuckCount, sampleJson } = await getRelocateStuckMonitoring();

  return NextResponse.json({
    ok: stuckCount === 0,
    stuckRelocateClaimCount: stuckCount,
    alertAfterClaimAgeMs: RELOCATE_CLAIM_ALERT_AFTER_MS,
    staleClaimResetAfterMs: RELOCATE_CLAIM_STALE_MS,
    stuckSample: sampleJson,
    ...(stuckCount > 0 && { hint: STUCK_HINT }),
    checkedAt: new Date().toISOString(),
  });
}
