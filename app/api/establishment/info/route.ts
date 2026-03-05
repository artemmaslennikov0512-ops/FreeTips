/**
 * GET /api/establishment/info — данные заведения для кабинета (лимит, кол-во сотрудников).
 * Требует: ESTABLISHMENT_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const establishment = await db.establishment.findUnique({
    where: { id: auth.establishmentId },
    select: {
      id: true,
      name: true,
      uniqueSlug: true,
      maxEmployeesCount: true,
      _count: { select: { employees: true } },
    },
  });

  if (!establishment) {
    return NextResponse.json({ error: "Заведение не найдено" }, { status: 404 });
  }

  return NextResponse.json({
    id: establishment.id,
    name: establishment.name,
    uniqueSlug: establishment.uniqueSlug,
    maxEmployeesCount: establishment.maxEmployeesCount,
    employeesCount: establishment._count.employees,
  });
}
