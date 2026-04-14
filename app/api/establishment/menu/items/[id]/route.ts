/** PATCH DELETE /api/establishment/menu/items/[id] */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, jsonError } from "@/lib/api/helpers";

const priceKopField = z
  .union([z.string().regex(/^\d+$/), z.number().int().min(0)])
  .transform((v) => BigInt(typeof v === "string" ? v : String(v)));

const patchSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.union([z.undefined(), z.string().max(500)]),
  ),
  priceKop: priceKopField.optional(),
  sortOrder: z.number().int().optional(),
  isAvailable: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const existing = await db.establishmentMenuItem.findFirst({
    where: { id, category: { establishmentId: auth.establishmentId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Позиция не найдена" }, { status: 404 });
  }

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = patchSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const d = body.data;
  if (
    d.name === undefined &&
    d.description === undefined &&
    d.priceKop === undefined &&
    d.sortOrder === undefined &&
    d.isAvailable === undefined
  ) {
    return jsonError(400, "Нет полей для обновления");
  }

  if (d.priceKop !== undefined && d.priceKop > BigInt(50_000_000)) {
    return jsonError(400, "Слишком большая цена");
  }

  const it = await db.establishmentMenuItem.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name.trim() } : {}),
      ...(d.description !== undefined ? { description: d.description ?? null } : {}),
      ...(d.priceKop !== undefined ? { priceKop: d.priceKop } : {}),
      ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
      ...(d.isAvailable !== undefined ? { isAvailable: d.isAvailable } : {}),
    },
  });

  return NextResponse.json({
    id: it.id,
    categoryId: it.categoryId,
    name: it.name,
    description: it.description,
    priceKop: it.priceKop.toString(),
    sortOrder: it.sortOrder,
    isAvailable: it.isAvailable,
  });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const deleted = await db.establishmentMenuItem.deleteMany({
    where: { id, category: { establishmentId: auth.establishmentId } },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Позиция не найдена" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
