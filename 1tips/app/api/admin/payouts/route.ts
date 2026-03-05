/**
 * GET /api/admin/payouts
 * Список всех заявок на вывод с данными пользователя.
 * Требует: Authorization: Bearer <access_token>, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseLimitOffset } from "@/lib/api/helpers";

const statusSchema = z.enum(["CREATED", "PROCESSING", "COMPLETED", "REJECTED"]);

export async function GET(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const { limit, offset } = parseLimitOffset(searchParams, {
    defaultLimit: 50,
    maxLimit: 100,
  });
  const statusParam = searchParams.get("status");
  const statusParse = statusParam ? statusSchema.safeParse(statusParam) : null;
  if (statusParse && !statusParse.success) {
    return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
  }
  const status = statusParse?.success ? statusParse.data : null;

  const where = status ? { status } : {};

  const [payouts, total] = await Promise.all([
    db.payoutRequest.findMany({
      where,
      include: {
        user: {
          select: { id: true, login: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.payoutRequest.count({ where }),
  ]);

  return NextResponse.json({
    payouts: payouts.map((p) => ({
      id: p.id,
      userId: p.userId,
      userLogin: p.user.login,
      userEmail: p.user.email,
      amountKop: Number(p.amountKop),
      status: p.status,
      details: p.details,
      externalId: p.externalId,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    total,
    limit,
    offset,
  });
}
