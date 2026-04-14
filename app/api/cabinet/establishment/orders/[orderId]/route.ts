/**
 * PATCH /api/cabinet/establishment/orders/[orderId] — статус заказа (пречек / отмена).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EstablishmentTableOrderStatus } from "@prisma/client";
import { requireEstablishmentEmployee } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit } from "@/lib/api/helpers";

const patchSchema = z.object({
  status: z.nativeEnum(EstablishmentTableOrderStatus),
});

type Ctx = { params: Promise<{ orderId: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentEmployee(request);
  if ("response" in auth) return auth.response;

  const { orderId } = await ctx.params;

  const order = await db.establishmentTableOrder.findFirst({
    where: {
      id: orderId,
      establishmentId: auth.establishmentId,
      employeeId: auth.employeeId,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = patchSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: body.error.flatten() }, { status: 400 });
  }

  const next = body.data.status;
  if (next === EstablishmentTableOrderStatus.OPEN) {
    return NextResponse.json({ error: "Нельзя вернуть статус OPEN" }, { status: 400 });
  }

  if (order.status !== EstablishmentTableOrderStatus.OPEN) {
    return NextResponse.json({ error: "Заказ уже зафиксирован" }, { status: 400 });
  }

  const updated = await db.establishmentTableOrder.update({
    where: { id: orderId },
    data: {
      status: next,
      presentedAt: next === EstablishmentTableOrderStatus.PRESENTED ? new Date() : order.presentedAt,
    },
    include: { lines: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    totalKop: updated.totalKop.toString(),
    presentedAt: updated.presentedAt?.toISOString() ?? null,
    lines: updated.lines.map((l) => ({
      id: l.id,
      menuItemId: l.menuItemId,
      nameSnapshot: l.nameSnapshot,
      priceKopSnapshot: l.priceKopSnapshot.toString(),
      quantity: l.quantity,
      comment: l.comment,
    })),
  });
}
