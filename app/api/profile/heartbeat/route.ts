/**
 * POST /api/profile/heartbeat — явный пинг из ЛК (вкладка видима).
 * Обновление lastSeenAt выполняется в requireAuth (тот же троттлинг); маршрут остаётся для клиента.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  return NextResponse.json({ ok: true });
}
