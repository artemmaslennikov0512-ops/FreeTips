/** POST /api/establishment/menu/items */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, jsonError } from "@/lib/api/helpers";

const priceKopField = z
  .union([z.string().regex(/^\d+$/), z.number().int().min(0)])
  .transform((v) => BigInt(typeof v === "string" ? v : String(v)));

const schema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  description: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.union([z.undefined(), z.string().max(500)]),
  ),
  priceKop: priceKopField,
  sortOrder: z.number().int().optional(),
  isAvailable: z.boolean().optional(),
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

  if (body.data.priceKop > BigInt(50_000_000)) {
    return jsonError(400, "Слишком большая цена");
  }

  const cat = await db.establishmentMenuCategory.findFirst({
    where: { id: body.data.categoryId, establishmentId: auth.establishmentId },
  });
  if (!cat) {
    return jsonError(400, "Категория не найдена");
  }

  const maxSort = await db.establishmentMenuItem.aggregate({
    where: { categoryId: body.data.categoryId },
    _max: { sortOrder: true },
  });
  const sortOrder =
    body.data.sortOrder ?? (maxSort._max.sortOrder != null ? maxSort._max.sortOrder + 1 : 0);

  const it = await db.establishmentMenuItem.create({
    data: {
      categoryId: body.data.categoryId,
      name: body.data.name.trim(),
      description: body.data.description ?? null,
      priceKop: body.data.priceKop,
      sortOrder,
      isAvailable: body.data.isAvailable ?? true,
    },
  });

  return NextResponse.json(
    {
      id: it.id,
      categoryId: it.categoryId,
      name: it.name,
      description: it.description,
      priceKop: it.priceKop.toString(),
      sortOrder: it.sortOrder,
      isAvailable: it.isAvailable,
    },
    { status: 201 },
  );
}
