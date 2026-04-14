/**
 * POST /api/cabinet/establishment/tables/[tableId]/open — открыть стол: сессия + заказ (или вернуть существующие).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  EstablishmentServiceSessionStatus,
  EstablishmentTableOrderStatus,
} from "@prisma/client";
import { requireEstablishmentEmployee } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api/helpers";

type Ctx = { params: Promise<{ tableId: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentEmployee(request);
  if ("response" in auth) return auth.response;

  const { tableId } = await ctx.params;

  const table = await db.establishmentTable.findFirst({
    where: { id: tableId, hall: { establishmentId: auth.establishmentId } },
    select: { id: true },
  });
  if (!table) {
    return NextResponse.json({ error: "Стол не найден" }, { status: 404 });
  }

  const existing = await db.establishmentServiceSession.findFirst({
    where: {
      tableId,
      establishmentId: auth.establishmentId,
      status: EstablishmentServiceSessionStatus.OPEN,
    },
    include: { tableOrder: true },
  });

  if (existing) {
    if (existing.employeeId && existing.employeeId !== auth.employeeId) {
      return jsonError(409, "Стол занят другим официантом");
    }

    if (!existing.employeeId) {
      await db.establishmentServiceSession.update({
        where: { id: existing.id },
        data: { employeeId: auth.employeeId },
      });
    }

    let order = existing.tableOrder;
    if (!order) {
      order = await db.establishmentTableOrder.create({
        data: {
          establishmentId: auth.establishmentId,
          serviceSessionId: existing.id,
          employeeId: auth.employeeId,
          status: EstablishmentTableOrderStatus.OPEN,
        },
      });
    } else if (order.employeeId !== auth.employeeId) {
      await db.establishmentTableOrder.update({
        where: { id: order.id },
        data: { employeeId: auth.employeeId },
      });
    }

    const orderId = order.id;
    const full = await db.establishmentTableOrder.findUnique({
      where: { id: orderId },
      include: { lines: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({
      sessionId: existing.id,
      order: full
        ? {
            id: full.id,
            status: full.status,
            totalKop: full.totalKop.toString(),
            lines: full.lines.map((l) => ({
              id: l.id,
              menuItemId: l.menuItemId,
              nameSnapshot: l.nameSnapshot,
              priceKopSnapshot: l.priceKopSnapshot.toString(),
              quantity: l.quantity,
              comment: l.comment,
            })),
          }
        : null,
    });
  }

  const created = await db.$transaction(async (tx) => {
    const session = await tx.establishmentServiceSession.create({
      data: {
        establishmentId: auth.establishmentId,
        tableId,
        employeeId: auth.employeeId,
        status: EstablishmentServiceSessionStatus.OPEN,
      },
    });
    const order = await tx.establishmentTableOrder.create({
      data: {
        establishmentId: auth.establishmentId,
        serviceSessionId: session.id,
        employeeId: auth.employeeId,
        status: EstablishmentTableOrderStatus.OPEN,
      },
      include: { lines: true },
    });
    return { session, order };
  });

  return NextResponse.json(
    {
      sessionId: created.session.id,
      order: {
        id: created.order.id,
        status: created.order.status,
        totalKop: created.order.totalKop.toString(),
        lines: [],
      },
    },
    { status: 201 },
  );
}
