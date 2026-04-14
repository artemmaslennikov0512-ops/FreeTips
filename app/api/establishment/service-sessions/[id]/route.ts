/** PATCH /api/establishment/service-sessions/[id] — закрыть сессию (status CLOSED). */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EstablishmentServiceSessionStatus } from "@prisma/client";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, jsonError } from "@/lib/api/helpers";

const patchSchema = z.object({
  status: z.literal("CLOSED"),
});

function serializeSession(s: {
  id: string;
  tableId: string;
  employeeId: string | null;
  status: EstablishmentServiceSessionStatus;
  openedAt: Date;
  closedAt: Date | null;
  table: { label: string; hall: { name: string } };
  employee: { id: string; name: string } | null;
}) {
  return {
    id: s.id,
    tableId: s.tableId,
    employeeId: s.employeeId,
    status: s.status,
    openedAt: s.openedAt.toISOString(),
    closedAt: s.closedAt?.toISOString() ?? null,
    tableLabel: `${s.table.hall.name} · стол ${s.table.label}`,
    employeeName: s.employee?.name ?? null,
  };
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const existing = await db.establishmentServiceSession.findFirst({
    where: { id, establishmentId: auth.establishmentId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
  }

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = patchSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json(
      { error: "Ожидается { \"status\": \"CLOSED\" }" },
      { status: 400 },
    );
  }

  if (existing.status === EstablishmentServiceSessionStatus.CLOSED) {
    return jsonError(400, "Сессия уже закрыта");
  }

  const session = await db.establishmentServiceSession.update({
    where: { id },
    data: {
      status: EstablishmentServiceSessionStatus.CLOSED,
      closedAt: new Date(),
    },
    include: {
      table: { select: { label: true, hall: { select: { name: true } } } },
      employee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(serializeSession(session));
}
