/**
 * GET /api/establishment/tables/[id]
 * PATCH /api/establishment/tables/[id] — поля стола, опционально hallId (другой зал того же заведения).
 * DELETE /api/establishment/tables/[id]
 * Требует: ESTABLISHMENT_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, jsonError } from "@/lib/api/helpers";
import { Prisma } from "@prisma/client";

const patchTableSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  capacity: z.number().int().min(1).max(99).optional(),
  sortOrder: z.number().int().optional(),
  hallId: z.string().min(1).optional(),
  externalCode: z
    .union([z.string().trim().max(64), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const table = await db.establishmentTable.findFirst({
    where: { id, hall: { establishmentId: auth.establishmentId } },
    include: { hall: { select: { id: true, name: true } } },
  });
  if (!table) {
    return NextResponse.json({ error: "Стол не найден" }, { status: 404 });
  }

  return NextResponse.json({
    id: table.id,
    hallId: table.hallId,
    hallName: table.hall.name,
    label: table.label,
    capacity: table.capacity,
    sortOrder: table.sortOrder,
    externalCode: table.externalCode,
    createdAt: table.createdAt.toISOString(),
    updatedAt: table.updatedAt.toISOString(),
  });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const existing = await db.establishmentTable.findFirst({
    where: { id, hall: { establishmentId: auth.establishmentId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Стол не найден" }, { status: 404 });
  }

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = patchTableSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const { label, capacity, sortOrder, hallId, externalCode } = body.data;
  if (
    label === undefined &&
    capacity === undefined &&
    sortOrder === undefined &&
    hallId === undefined &&
    externalCode === undefined
  ) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  let targetHallId = existing.hallId;
  if (hallId !== undefined && hallId !== existing.hallId) {
    const hall = await db.establishmentHall.findFirst({
      where: { id: hallId, establishmentId: auth.establishmentId },
    });
    if (!hall) {
      return NextResponse.json({ error: "Целевой зал не найден" }, { status: 400 });
    }
    targetHallId = hallId;
  }

  try {
    const table = await db.establishmentTable.update({
      where: { id },
      data: {
        ...(label !== undefined ? { label: label.trim() } : {}),
        ...(capacity !== undefined ? { capacity } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(hallId !== undefined ? { hallId: targetHallId } : {}),
        ...(externalCode !== undefined ? { externalCode } : {}),
      },
    });
    return NextResponse.json({
      id: table.id,
      hallId: table.hallId,
      label: table.label,
      capacity: table.capacity,
      sortOrder: table.sortOrder,
      externalCode: table.externalCode,
      createdAt: table.createdAt.toISOString(),
      updatedAt: table.updatedAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return jsonError(409, "Стол с таким обозначением уже есть в этом зале");
    }
    throw e;
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const deleted = await db.establishmentTable.deleteMany({
    where: { id, hall: { establishmentId: auth.establishmentId } },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Стол не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
