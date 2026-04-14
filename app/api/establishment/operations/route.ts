/**
 * GET /api/establishment/operations — манифест разделов «Зал и сервис» и счётчики залов/столов.
 * Требует: ESTABLISHMENT_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { EstablishmentBookingStatus, EstablishmentServiceSessionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ESTABLISHMENT_OPERATIONS_MODULES } from "@/lib/establishment-operations-modules";
import { logError } from "@/lib/logger";

export async function GET(_request: NextRequest) {
  const auth = await requireEstablishmentAdmin(_request);
  if (auth.response) return auth.response;

  try {
    const [hallsCount, tablesCount, bookingsCount, guestsCount, menuItemsCount, openSessionsCount] =
      await Promise.all([
        db.establishmentHall.count({ where: { establishmentId: auth.establishmentId } }),
        db.establishmentTable.count({
          where: { hall: { establishmentId: auth.establishmentId } },
        }),
        db.establishmentBooking.count({
          where: {
            establishmentId: auth.establishmentId,
            status: { not: EstablishmentBookingStatus.CANCELLED },
            endsAt: { gt: new Date() },
          },
        }),
        db.establishmentGuest.count({ where: { establishmentId: auth.establishmentId } }),
        db.establishmentMenuItem.count({
          where: { category: { establishmentId: auth.establishmentId } },
        }),
        db.establishmentServiceSession.count({
          where: {
            establishmentId: auth.establishmentId,
            status: EstablishmentServiceSessionStatus.OPEN,
          },
        }),
      ]);

    return NextResponse.json({
      modules: ESTABLISHMENT_OPERATIONS_MODULES,
      counts: {
        halls: hallsCount,
        tables: tablesCount,
        bookings: bookingsCount,
        guests: guestsCount,
        menuItems: menuItemsCount,
        openServiceSessions: openSessionsCount,
      },
    });
  } catch (e) {
    logError("establishment.operations.count_failed", e, {
      establishmentId: auth.establishmentId,
    });
    return NextResponse.json(
      {
        error:
          "Не удалось прочитать данные (залы / столы / брони). Примените миграции Prisma.",
        hint: "docker compose exec web sh -c \"prisma migrate deploy\"",
      },
      { status: 503 },
    );
  }
}
