/** GET PATCH DELETE /api/establishment/menu/categories/[id] */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, jsonError } from "@/lib/api/helpers";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  sortOrder: z.number().int().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function assertCategory(establishmentId: string, id: string) {
  return db.establishmentMenuCategory.findFirst({
    where: { id, establishmentId },
    include: { items: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
  });
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const cat = await assertCategory(auth.establishmentId, id);
  if (!cat) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
  }

  return NextResponse.json({
    id: cat.id,
    name: cat.name,
    sortOrder: cat.sortOrder,
    items: cat.items.map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description,
      priceKop: it.priceKop.toString(),
      sortOrder: it.sortOrder,
      isAvailable: it.isAvailable,
    })),
  });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const existing = await assertCategory(auth.establishmentId, id);
  if (!existing) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
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

  if (body.data.name === undefined && body.data.sortOrder === undefined) {
    return jsonError(400, "Нет полей для обновления");
  }

  const cat = await db.establishmentMenuCategory.update({
    where: { id },
    data: {
      ...(body.data.name !== undefined ? { name: body.data.name.trim() } : {}),
      ...(body.data.sortOrder !== undefined ? { sortOrder: body.data.sortOrder } : {}),
    },
  });

  return NextResponse.json({ id: cat.id, name: cat.name, sortOrder: cat.sortOrder });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const deleted = await db.establishmentMenuCategory.deleteMany({
    where: { id, establishmentId: auth.establishmentId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
