/**
 * PATCH / DELETE .../orders/[orderId]/lines/[lineId] — количество / удаление строки.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEstablishmentEmployee } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, jsonError } from "@/lib/api/helpers";
import { assertOrderEditable, recalcTableOrderTotalKop } from "@/lib/cabinet-table-order";

const patchSchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

type Ctx = { params: Promise<{ orderId: string; lineId: string }> };

async function loadLine(orderId: string, lineId: string, establishmentId: string, employeeId: string) {
  return db.establishmentTableOrderLine.findFirst({
    where: {
      id: lineId,
      order: {
        id: orderId,
        establishmentId,
        employeeId,
      },
    },
    include: { order: { select: { status: true } } },
  });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentEmployee(request);
  if ("response" in auth) return auth.response;

  const { orderId, lineId } = await ctx.params;

  const line = await loadLine(orderId, lineId, auth.establishmentId, auth.employeeId);
  if (!line) {
    return NextResponse.json({ error: "Строка не найдена" }, { status: 404 });
  }

  try {
    assertOrderEditable(line.order.status);
  } catch {
    return jsonError(400, "Заказ закрыт для редактирования");
  }

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = patchSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: body.error.flatten() }, { status: 400 });
  }

  await db.establishmentTableOrderLine.update({
    where: { id: lineId },
    data: { quantity: body.data.quantity },
  });

  const totalKop = await recalcTableOrderTotalKop(orderId);

  return NextResponse.json({ ok: true, totalKop: totalKop.toString() });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentEmployee(request);
  if ("response" in auth) return auth.response;

  const { orderId, lineId } = await ctx.params;

  const line = await loadLine(orderId, lineId, auth.establishmentId, auth.employeeId);
  if (!line) {
    return NextResponse.json({ error: "Строка не найдена" }, { status: 404 });
  }

  try {
    assertOrderEditable(line.order.status);
  } catch {
    return jsonError(400, "Заказ закрыт для редактирования");
  }

  await db.establishmentTableOrderLine.delete({ where: { id: lineId } });
  const totalKop = await recalcTableOrderTotalKop(orderId);

  return NextResponse.json({ ok: true, totalKop: totalKop.toString() });
}
