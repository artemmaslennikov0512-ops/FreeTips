/**
 * GET /api/admin/fraud-signals — сигналы антифрода по пользователям (наблюдение).
 * Требует: SUPERADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";

const MAX_ROWS_SCAN = 800;
const DEFAULT_DAYS = 60;
const MAX_DAYS = 365;

export async function GET(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const daysRaw = parseInt(searchParams.get("days") ?? String(DEFAULT_DAYS), 10);
  const days = Number.isFinite(daysRaw) ? Math.min(MAX_DAYS, Math.max(1, daysRaw)) : DEFAULT_DAYS;
  const usersRaw = parseInt(searchParams.get("users") ?? "40", 10);
  const maxUsers = Number.isFinite(usersRaw) ? Math.min(100, Math.max(5, usersRaw)) : 40;
  const perRaw = parseInt(searchParams.get("perUser") ?? "8", 10);
  const signalsPerUser = Number.isFinite(perRaw) ? Math.min(20, Math.max(3, perRaw)) : 8;

  const since = new Date(Date.now() - days * 86400000);

  const [distinctUsers, rows] = await Promise.all([
    db.fraudSignal.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since } },
    }),
    db.fraudSignal.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS_SCAN,
      include: {
        user: { select: { login: true, email: true, role: true, isBlocked: true } },
      },
    }),
  ]);

  type Group = {
    userId: string;
    login: string;
    email: string | null;
    role: string;
    isBlocked: boolean;
    lastSignalAt: string;
    signals: { id: string; ruleCode: string; message: string; createdAt: string }[];
  };

  const map = new Map<string, Group>();
  for (const row of rows) {
    let g = map.get(row.userId);
    if (!g) {
      g = {
        userId: row.userId,
        login: row.user.login,
        email: row.user.email,
        role: row.user.role,
        isBlocked: row.user.isBlocked,
        lastSignalAt: row.createdAt.toISOString(),
        signals: [],
      };
      map.set(row.userId, g);
    }
    if (g.signals.length < signalsPerUser) {
      g.signals.push({
        id: row.id,
        ruleCode: row.ruleCode,
        message: row.message,
        createdAt: row.createdAt.toISOString(),
      });
    }
  }

  const groups = [...map.values()]
    .sort((a, b) => new Date(b.lastSignalAt).getTime() - new Date(a.lastSignalAt).getTime())
    .slice(0, maxUsers);

  return NextResponse.json({
    groups,
    distinctUserCount: distinctUsers.length,
    days,
  });
}
