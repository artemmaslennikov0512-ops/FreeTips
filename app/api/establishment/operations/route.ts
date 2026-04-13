/**
 * GET /api/establishment/operations — разделы операционного кабинета и счётчики (залы/столы).
 * Требует: ESTABLISHMENT_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { ESTABLISHMENT_OPERATIONS_MODULES } from "@/lib/establishment-operations-modules";
import { logError } from "@/lib/logger";

export async function GET(_request: NextRequest) {
  const auth = await requireEstablishmentAdmin(_request);
  if (auth.response) return auth.response;

  try {
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
  } catch (e) {
    logError("establishment.operations.count_failed", e, {
      establishmentId: auth.establishmentId,
    });
    return NextResponse.json(
      {
        error:
          "Не удалось прочитать данные залов. На сервере нужно применить миграции Prisma (таблицы establishment_halls / establishment_tables).",
        hint: "docker compose exec web sh -c \"prisma migrate deploy\"",
      },
      { status: 503 },
    );
  }
}
