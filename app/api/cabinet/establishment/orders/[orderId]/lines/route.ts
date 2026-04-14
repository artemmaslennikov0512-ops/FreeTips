/**
 * POST /api/cabinet/establishment/orders/[orderId]/lines — добавить позицию в заказ.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EstablishmentTableOrderStatus } from "@prisma/client";
import { requireEstablishmentEmployee } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, jsonError } from "@/lib/api/helpers";
import { assertOrderEditable, recalcTableOrderTotalKop } from "@/lib/cabinet-table-order";

const MAX_LINES = 150;

const postSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).optional().default(1),
  comment: z.union([z.string().trim().max(200), z.literal("")]).optional(),
});

type Ctx = { params: Promise<{ orderId: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
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

  try {
    assertOrderEditable(order.status);
  } catch {
    return jsonError(400, "Заказ закрыт для редактирования");
  }

  const count = await db.establishmentTableOrderLine.count({ where: { orderId } });
  if (count >= MAX_LINES) {
    return jsonError(400, "Слишком много позиций в одном заказе");
  }

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = postSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: body.error.flatten() }, { status: 400 });
  }

  const item = await db.establishmentMenuItem.findFirst({
    where: {
      id: body.data.menuItemId,
      category: { establishmentId: auth.establishmentId },
      isAvailable: true,
    },
  });
  if (!item) {
    return jsonError(400, "Позиция недоступна или не найдена");
  }

  const line = await db.establishmentTableOrderLine.create({
    data: {
      orderId,
      menuItemId: item.id,
      nameSnapshot: item.name,
      priceKopSnapshot: item.priceKop,
      quantity: body.data.quantity,
      comment: body.data.comment && body.data.comment.length > 0 ? body.data.comment : null,
    },
  });

  const totalKop = await recalcTableOrderTotalKop(orderId);

  return NextResponse.json(
    {
      line: {
        id: line.id,
        menuItemId: line.menuItemId,
        nameSnapshot: line.nameSnapshot,
        priceKopSnapshot: line.priceKopSnapshot.toString(),
        quantity: line.quantity,
        comment: line.comment,
      },
      totalKop: totalKop.toString(),
    },
    { status: 201 },
  );
}
