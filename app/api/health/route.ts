/**
 * GET /api/health — проверка доступности БД для балансировщика и мониторинга.
 * Если задан HEALTH_CHECK_SECRET — полный ответ только при ?secret= или заголовке x-health-check-secret.
 * Иначе — прежнее поведение (полный JSON всем).
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function healthSecretOk(request: NextRequest): boolean {
  const secret = process.env.HEALTH_CHECK_SECRET?.trim();
  if (!secret) return true;
  const q = request.nextUrl.searchParams.get("secret")?.trim();
  const h = request.headers.get("x-health-check-secret")?.trim();
  return q === secret || h === secret;
}

export async function GET(request: NextRequest) {
  if (!healthSecretOk(request)) {
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }

  const start = Date.now();
  try {
    await db.$queryRaw(Prisma.sql`SELECT 1`);
    const latencyMs = Date.now() - start;
    return NextResponse.json({
      status: "ok",
      db: "ok",
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch {
    const latencyMs = Date.now() - start;
    return NextResponse.json(
      {
        status: "degraded",
        db: "error",
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
