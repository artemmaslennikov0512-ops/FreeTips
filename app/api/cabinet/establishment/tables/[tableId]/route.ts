/**
 * GET /api/cabinet/establishment/tables/[tableId] — стол, открытая сессия, заказ и строки.
 */

import { NextRequest, NextResponse } from "next/server";
import { EstablishmentServiceSessionStatus } from "@prisma/client";
import { requireEstablishmentEmployee } from "@/lib/middleware/auth";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ tableId: string }> };

function serializeLines(
  lines: {
    id: string;
    menuItemId: string | null;
    nameSnapshot: string;
    priceKopSnapshot: bigint;
    quantity: number;
    comment: string | null;
  }[],
) {
  return lines.map((l) => ({
    id: l.id,
    menuItemId: l.menuItemId,
    nameSnapshot: l.nameSnapshot,
    priceKopSnapshot: l.priceKopSnapshot.toString(),
    quantity: l.quantity,
    comment: l.comment,
  }));
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentEmployee(request);
  if ("response" in auth) return auth.response;

  const { tableId } = await ctx.params;

  const table = await db.establishmentTable.findFirst({
    where: { id: tableId, hall: { establishmentId: auth.establishmentId } },
    include: { hall: { select: { id: true, name: true } } },
  });
  if (!table) {
    return NextResponse.json({ error: "Стол не найден" }, { status: 404 });
  }

  const session = await db.establishmentServiceSession.findFirst({
    where: {
      tableId,
      establishmentId: auth.establishmentId,
      status: EstablishmentServiceSessionStatus.OPEN,
    },
    include: {
      employee: { select: { id: true, name: true } },
      tableOrder: {
        include: {
          lines: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  const foreign =
    session &&
    session.employeeId &&
    session.employeeId !== auth.employeeId;

  const order = foreign ? null : session?.tableOrder ?? null;
  const sessionPayload = session
    ? foreign
      ? {
          id: session.id,
          employeeId: session.employeeId,
          employeeName: session.employee?.name ?? null,
          mySession: false,
          openedAt: session.openedAt.toISOString(),
          blocked: true as const,
        }
      : {
          id: session.id,
          employeeId: session.employeeId,
          employeeName: session.employee?.name ?? null,
          mySession: !session.employeeId || session.employeeId === auth.employeeId,
          openedAt: session.openedAt.toISOString(),
          blocked: false as const,
        }
    : null;

  return NextResponse.json({
    table: {
      id: table.id,
      label: table.label,
      capacity: table.capacity,
      hallId: table.hall.id,
      hallName: table.hall.name,
    },
    session: sessionPayload,
    order: order
      ? {
          id: order.id,
          status: order.status,
          totalKop: order.totalKop.toString(),
          presentedAt: order.presentedAt?.toISOString() ?? null,
          lines: serializeLines(order.lines),
        }
      : null,
  });
}
