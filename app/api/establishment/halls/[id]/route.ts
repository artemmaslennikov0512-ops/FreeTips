/**
 * GET /api/establishment/halls/[id] — один зал со столами.
 * PATCH /api/establishment/halls/[id] — переименовать / порядок.
 * DELETE /api/establishment/halls/[id] — удалить зал и столы.
 * Требует: ESTABLISHMENT_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit } from "@/lib/api/helpers";

const patchHallSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  sortOrder: z.number().int().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const hall = await db.establishmentHall.findFirst({
    where: { id, establishmentId: auth.establishmentId },
    include: { tables: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] } },
  });
  if (!hall) {
    return NextResponse.json({ error: "Зал не найден" }, { status: 404 });
  }

  return NextResponse.json({
    id: hall.id,
    establishmentId: hall.establishmentId,
    name: hall.name,
    sortOrder: hall.sortOrder,
    createdAt: hall.createdAt.toISOString(),
    updatedAt: hall.updatedAt.toISOString(),
    tables: hall.tables.map((t) => ({
      id: t.id,
      hallId: t.hallId,
      label: t.label,
      capacity: t.capacity,
      sortOrder: t.sortOrder,
      externalCode: t.externalCode,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const existing = await db.establishmentHall.findFirst({
    where: { id, establishmentId: auth.establishmentId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Зал не найден" }, { status: 404 });
  }

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = patchHallSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: body.error.flatten() },
      { status: 400 },
    );
  }

  if (body.data.name === undefined && body.data.sortOrder === undefined) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  const hall = await db.establishmentHall.update({
    where: { id },
    data: {
      ...(body.data.name !== undefined ? { name: body.data.name.trim() } : {}),
      ...(body.data.sortOrder !== undefined ? { sortOrder: body.data.sortOrder } : {}),
    },
    include: { tables: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] } },
  });

  return NextResponse.json({
    id: hall.id,
    establishmentId: hall.establishmentId,
    name: hall.name,
    sortOrder: hall.sortOrder,
    createdAt: hall.createdAt.toISOString(),
    updatedAt: hall.updatedAt.toISOString(),
    tables: hall.tables.map((t) => ({
      id: t.id,
      hallId: t.hallId,
      label: t.label,
      capacity: t.capacity,
      sortOrder: t.sortOrder,
      externalCode: t.externalCode,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const deleted = await db.establishmentHall.deleteMany({
    where: { id, establishmentId: auth.establishmentId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Зал не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
