/**
 * GET /api/establishment/halls/[id]/tables — столы зала.
 * POST /api/establishment/halls/[id]/tables — добавить стол.
 * Требует: ESTABLISHMENT_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, jsonError } from "@/lib/api/helpers";
import { Prisma } from "@prisma/client";
import { allocateNextGlobalWaiterCode, WaiterQrIdentifierExhaustedError } from "@/lib/waiter-qr-identifier";
import { ensureTablePaySlugsForEstablishment } from "@/lib/ensure-table-pay-slugs";

const createTableSchema = z.object({
  label: z.string().trim().min(1, "Укажите обозначение стола").max(80),
  capacity: z.number().int().min(1).max(99).optional(),
  sortOrder: z.number().int().optional(),
  externalCode: z
    .union([z.string().trim().max(64), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
});

type Ctx = { params: Promise<{ id: string }> };

async function assertHall(hallId: string, establishmentId: string) {
  return db.establishmentHall.findFirst({
    where: { id: hallId, establishmentId },
    select: { id: true },
  });
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id: hallId } = await ctx.params;

  const hall = await assertHall(hallId, auth.establishmentId);
  if (!hall) {
    return NextResponse.json({ error: "Зал не найден" }, { status: 404 });
  }

  await ensureTablePaySlugsForEstablishment(auth.establishmentId);

  const tables = await db.establishmentTable.findMany({
    where: { hallId },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  return NextResponse.json({
    tables: tables.map((t) => ({
      id: t.id,
      hallId: t.hallId,
      label: t.label,
      capacity: t.capacity,
      sortOrder: t.sortOrder,
      externalCode: t.externalCode,
      tablePaySlug: t.tablePaySlug,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id: hallId } = await ctx.params;

  const hall = await assertHall(hallId, auth.establishmentId);
  if (!hall) {
    return NextResponse.json({ error: "Зал не найден" }, { status: 404 });
  }

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = createTableSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const maxSort = await db.establishmentTable.aggregate({
    where: { hallId },
    _max: { sortOrder: true },
  });
  const nextOrder =
    body.data.sortOrder ?? (maxSort._max.sortOrder != null ? maxSort._max.sortOrder + 1 : 0);

  try {
    const table = await db.$transaction(async (tx) => {
      const tablePaySlug = await allocateNextGlobalWaiterCode(tx);
      return tx.establishmentTable.create({
        data: {
          hallId,
          label: body.data.label.trim(),
          capacity: body.data.capacity ?? 2,
          sortOrder: nextOrder,
          externalCode: body.data.externalCode ?? null,
          tablePaySlug,
        },
      });
    });
    return NextResponse.json(
      {
        id: table.id,
        hallId: table.hallId,
        label: table.label,
        capacity: table.capacity,
        sortOrder: table.sortOrder,
        externalCode: table.externalCode,
        tablePaySlug: table.tablePaySlug,
        createdAt: table.createdAt.toISOString(),
        updatedAt: table.updatedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof WaiterQrIdentifierExhaustedError) {
      return jsonError(503, e.message);
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return jsonError(409, "Стол с таким обозначением уже есть в этом зале");
    }
    throw e;
  }
}
