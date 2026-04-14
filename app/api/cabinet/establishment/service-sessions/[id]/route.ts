/**
 * PATCH /api/cabinet/establishment/service-sessions/[id] — закрыть сессию стола (официант).
 * Если заказ ещё OPEN — переводит в PRESENTED, затем закрывает сессию.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  EstablishmentServiceSessionStatus,
  EstablishmentTableOrderStatus,
} from "@prisma/client";
import { requireEstablishmentEmployee } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, jsonError } from "@/lib/api/helpers";

const patchSchema = z.object({
  status: z.literal("CLOSED"),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentEmployee(request);
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;

  const session = await db.establishmentServiceSession.findFirst({
    where: { id, establishmentId: auth.establishmentId },
    include: { tableOrder: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
  }

  if (session.employeeId && session.employeeId !== auth.employeeId) {
    return jsonError(403, "Это не ваша сессия");
  }

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = patchSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json({ error: "Ожидается { \"status\": \"CLOSED\" }" }, { status: 400 });
  }

  if (session.status === EstablishmentServiceSessionStatus.CLOSED) {
    return jsonError(400, "Сессия уже закрыта");
  }

  await db.$transaction(async (tx) => {
    if (session.tableOrder) {
      if (session.tableOrder.status === EstablishmentTableOrderStatus.OPEN) {
        await tx.establishmentTableOrder.update({
          where: { id: session.tableOrder.id },
          data: {
            status: EstablishmentTableOrderStatus.PRESENTED,
            presentedAt: new Date(),
          },
        });
      }
    }
    await tx.establishmentServiceSession.update({
      where: { id },
      data: {
        status: EstablishmentServiceSessionStatus.CLOSED,
        closedAt: new Date(),
      },
    });
  });

  return NextResponse.json({ ok: true, id, status: "CLOSED" });
}
