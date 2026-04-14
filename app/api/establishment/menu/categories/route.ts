/** POST /api/establishment/menu/categories */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit } from "@/lib/api/helpers";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = schema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const maxSort = await db.establishmentMenuCategory.aggregate({
    where: { establishmentId: auth.establishmentId },
    _max: { sortOrder: true },
  });
  const sortOrder =
    body.data.sortOrder ?? (maxSort._max.sortOrder != null ? maxSort._max.sortOrder + 1 : 0);

  const cat = await db.establishmentMenuCategory.create({
    data: {
      establishmentId: auth.establishmentId,
      name: body.data.name.trim(),
      sortOrder,
    },
  });

  return NextResponse.json(
    { id: cat.id, name: cat.name, sortOrder: cat.sortOrder, items: [] },
    { status: 201 },
  );
}
