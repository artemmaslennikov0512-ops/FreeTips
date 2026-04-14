/**
 * GET /api/establishment/menu — дерево категорий и позиций (цены в копейках, строкой в JSON).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const categories = await db.establishmentMenuCategory.findMany({
    where: { establishmentId: auth.establishmentId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  });

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      items: c.items.map((it) => ({
        id: it.id,
        categoryId: it.categoryId,
        name: it.name,
        description: it.description,
        priceKop: it.priceKop.toString(),
        sortOrder: it.sortOrder,
        isAvailable: it.isAvailable,
      })),
    })),
  });
}
