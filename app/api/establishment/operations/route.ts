/**
 * GET /api/establishment/operations — разделы операционного кабинета и счётчики (залы/столы).
 * Требует: ESTABLISHMENT_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { ESTABLISHMENT_OPERATIONS_MODULES } from "@/lib/establishment-operations-modules";

export async function GET(_request: NextRequest) {
  const auth = await requireEstablishmentAdmin(_request);
  if (auth.response) return auth.response;

  const [hallsCount, tablesCount] = await Promise.all([
    db.establishmentHall.count({ where: { establishmentId: auth.establishmentId } }),
    db.establishmentTable.count({
      where: { hall: { establishmentId: auth.establishmentId } },
    }),
  ]);

  return NextResponse.json({
    modules: ESTABLISHMENT_OPERATIONS_MODULES,
    counts: {
      halls: hallsCount,
      tables: tablesCount,
    },
  });
}
