/**
 * GET /api/establishment/service-sessions?status=OPEN|CLOSED — сессии обслуживания столов.
 * POST — открыть сессию (стол, опционально официант).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EstablishmentServiceSessionStatus } from "@prisma/client";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, jsonError } from "@/lib/api/helpers";

const postSchema = z.object({
  tableId: z.string().min(1),
  employeeId: z.union([z.string().min(1), z.literal(""), z.null()]).optional(),
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

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const st = request.nextUrl.searchParams.get("status")?.toUpperCase();
  const statusFilter =
    st === "OPEN" || st === "CLOSED" ? (st as EstablishmentServiceSessionStatus) : undefined;

  const list = await db.establishmentServiceSession.findMany({
    where: {
      establishmentId: auth.establishmentId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { openedAt: "desc" },
    take: 100,
    include: {
      table: { select: { label: true, hall: { select: { name: true } } } },
      employee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ sessions: list.map(serializeSession) });
}

export async function POST(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = postSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const table = await db.establishmentTable.findFirst({
    where: { id: body.data.tableId, hall: { establishmentId: auth.establishmentId } },
    select: { id: true },
  });
  if (!table) {
    return jsonError(400, "Стол не найден");
  }

  const openExists = await db.establishmentServiceSession.findFirst({
    where: {
      establishmentId: auth.establishmentId,
      tableId: body.data.tableId,
      status: EstablishmentServiceSessionStatus.OPEN,
    },
    select: { id: true },
  });
  if (openExists) {
    return jsonError(409, "На этом столе уже открыта сессия. Закройте её перед новой.");
  }

  let employeeId: string | null = null;
  const rawEmp = body.data.employeeId;
  if (rawEmp && rawEmp !== "") {
    const emp = await db.employee.findFirst({
      where: { id: rawEmp, establishmentId: auth.establishmentId, isActive: true },
      select: { id: true },
    });
    if (!emp) {
      return jsonError(400, "Сотрудник не найден или неактивен");
    }
    employeeId = emp.id;
  }

  const session = await db.establishmentServiceSession.create({
    data: {
      establishmentId: auth.establishmentId,
      tableId: body.data.tableId,
      employeeId,
      status: EstablishmentServiceSessionStatus.OPEN,
    },
    include: {
      table: { select: { label: true, hall: { select: { name: true } } } },
      employee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(serializeSession(session), { status: 201 });
}
