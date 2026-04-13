/**
 * GET /api/establishment/halls — список залов со столами.
 * POST /api/establishment/halls — создать зал.
 * Требует: ESTABLISHMENT_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit } from "@/lib/api/helpers";

const createHallSchema = z.object({
  name: z.string().trim().min(1, "Укажите название зала").max(120),
  sortOrder: z.number().int().optional(),
});

function serializeTable(t: {
  id: string;
  hallId: string;
  label: string;
  capacity: number;
  sortOrder: number;
  externalCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: t.id,
    hallId: t.hallId,
    label: t.label,
    capacity: t.capacity,
    sortOrder: t.sortOrder,
    externalCode: t.externalCode,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function serializeHall(
  h: {
    id: string;
    establishmentId: string;
    name: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  },
  tables: ReturnType<typeof serializeTable>[],
) {
  return {
    id: h.id,
    establishmentId: h.establishmentId,
    name: h.name,
    sortOrder: h.sortOrder,
    createdAt: h.createdAt.toISOString(),
    updatedAt: h.updatedAt.toISOString(),
    tables,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const halls = await db.establishmentHall.findMany({
    where: { establishmentId: auth.establishmentId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      tables: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
    },
  });

  return NextResponse.json({
    halls: halls.map((h) => serializeHall(h, h.tables.map(serializeTable))),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = createHallSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const maxSort = await db.establishmentHall.aggregate({
    where: { establishmentId: auth.establishmentId },
    _max: { sortOrder: true },
  });
  const nextOrder =
    body.data.sortOrder ?? (maxSort._max.sortOrder != null ? maxSort._max.sortOrder + 1 : 0);

  const hall = await db.establishmentHall.create({
    data: {
      establishmentId: auth.establishmentId,
      name: body.data.name.trim(),
      sortOrder: nextOrder,
    },
  });
  return NextResponse.json(serializeHall(hall, []), { status: 201 });
}
