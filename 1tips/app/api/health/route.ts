/**
 * GET /api/health — health check для load balancer и мониторинга.
 * Проверяет доступность БД. paygineConfigured — для диагностики редиректа на оплату.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const start = Date.now();
  const paygineConfigured = !!(
    process.env.PAYGINE_SECTOR?.trim() &&
    process.env.PAYGINE_PASSWORD?.trim()
  );
  try {
    await db.$queryRaw(Prisma.sql`SELECT 1`);
    const latencyMs = Date.now() - start;
    return NextResponse.json({
      status: "ok",
      db: "ok",
      paygineConfigured,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch {
    const latencyMs = Date.now() - start;
    return NextResponse.json(
      {
        status: "degraded",
        db: "error",
        paygineConfigured,
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
