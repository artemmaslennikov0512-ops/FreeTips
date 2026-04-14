/**
 * GET /api/establishment/bookings?date=YYYY-MM-DD — брони, пересекающие московский день.
 * POST /api/establishment/bookings — создать бронь.
 * Требует: ESTABLISHMENT_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EstablishmentBookingStatus } from "@prisma/client";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, jsonError } from "@/lib/api/helpers";
import {
  combineMoscowDateAndTime,
  moscowDayBoundsFromYmd,
  normalizeEndsAfterStart,
  todayYmdMoscow,
} from "@/lib/establishment-booking-moscow";
import { serializeEstablishmentBooking } from "@/lib/establishment-booking-serialize";

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 14 * 60 * 60 * 1000;

const createBookingSchema = z
  .object({
  guestName: z.string().trim().max(120).optional(),
  guestPhone: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.union([z.undefined(), z.string().max(40)]),
  ),
  guestEmail: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.union([z.undefined(), z.string().max(255).email()]),
  ),
  partySize: z.number().int().min(1).max(99),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  tableId: z.union([z.string().min(1).max(64), z.null()]).optional(),
  guestId: z.string().min(1).optional(),
  notes: z.union([z.string().trim().max(500), z.literal(""), z.null()]).optional(),
})
  .superRefine((d, ctx) => {
    const hasName = Boolean(d.guestName && d.guestName.length > 0);
    if (!d.guestId && !hasName) {
      ctx.addIssue({
        code: "custom",
        path: ["guestName"],
        message: "Укажите имя гостя или выберите карточку из базы",
      });
    }
  });

function normalizeOptionalString(v: string | null | undefined): string | null {
  if (v == null || v === "") return null;
  return v.trim();
}

async function assertTableInEstablishment(establishmentId: string, tableId: string) {
  return db.establishmentTable.findFirst({
    where: { id: tableId, hall: { establishmentId } },
    select: { id: true, capacity: true, label: true },
  });
}

async function hasTableOverlap(
  establishmentId: string,
  tableId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
): Promise<boolean> {
  const found = await db.establishmentBooking.findFirst({
    where: {
      establishmentId,
      tableId,
      id: excludeId ? { not: excludeId } : undefined,
      status: { not: EstablishmentBookingStatus.CANCELLED },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });
  return !!found;
}

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const dateParam = request.nextUrl.searchParams.get("date")?.trim();
  const ymd = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayYmdMoscow();
  const bounds = moscowDayBoundsFromYmd(ymd);
  if (!bounds) {
    return jsonError(400, "Некорректный параметр date");
  }

  const { start, endExclusive } = bounds;

  const list = await db.establishmentBooking.findMany({
    where: {
      establishmentId: auth.establishmentId,
      startsAt: { lt: endExclusive },
      endsAt: { gt: start },
    },
    orderBy: { startsAt: "asc" },
    include: {
      table: { select: { id: true, label: true, capacity: true, hall: { select: { name: true } } } },
      guest: { select: { id: true, displayName: true } },
    },
  });

  return NextResponse.json({
    date: ymd,
    bookings: list.map(serializeEstablishmentBooking),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = createBookingSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const startsAt = combineMoscowDateAndTime(body.data.date, body.data.startTime);
  let endsAt = combineMoscowDateAndTime(body.data.date, body.data.endTime);
  if (!startsAt || !endsAt) {
    return jsonError(400, "Некорректные дата или время");
  }
  endsAt = normalizeEndsAfterStart(startsAt, endsAt);
  if (endsAt.getTime() - startsAt.getTime() < MIN_DURATION_MS) {
    return jsonError(400, "Интервал брони не короче 15 минут");
  }
  if (endsAt.getTime() - startsAt.getTime() > MAX_DURATION_MS) {
    return jsonError(400, "Интервал брони не длиннее 14 часов");
  }
  if (endsAt <= startsAt) {
    return jsonError(400, "Время окончания должно быть позже начала");
  }

  const tableId = body.data.tableId ?? null;
  if (tableId) {
    const table = await assertTableInEstablishment(auth.establishmentId, tableId);
    if (!table) {
      return jsonError(400, "Стол не найден или не принадлежит заведению");
    }
    if (body.data.partySize > table.capacity) {
      return jsonError(400, `Число гостей не больше вместимости стола (${table.capacity})`);
    }
    const overlap = await hasTableOverlap(auth.establishmentId, tableId, startsAt, endsAt);
    if (overlap) {
      return jsonError(409, "На этот стол уже есть пересекающаяся бронь");
    }
  }

  let guestId: string | null = body.data.guestId ?? null;
  let guestName = (body.data.guestName ?? "").trim();
  let guestPhone = normalizeOptionalString(body.data.guestPhone as string | undefined);
  let guestEmail = normalizeOptionalString(body.data.guestEmail as string | undefined);
  if (guestId) {
    const guest = await db.establishmentGuest.findFirst({
      where: { id: guestId, establishmentId: auth.establishmentId },
    });
    if (!guest) {
      return jsonError(400, "Гость не найден");
    }
    if (!guestName) guestName = guest.displayName;
    if (!guestPhone && guest.phone) guestPhone = guest.phone;
    if (!guestEmail && guest.email) guestEmail = guest.email;
  }

  const booking = await db.establishmentBooking.create({
    data: {
      establishmentId: auth.establishmentId,
      tableId,
      guestId,
      guestName,
      guestPhone,
      guestEmail,
      partySize: body.data.partySize,
      startsAt,
      endsAt,
      notes: normalizeOptionalString(body.data.notes as string | undefined),
    },
    include: {
      table: { select: { id: true, label: true, capacity: true, hall: { select: { name: true } } } },
      guest: { select: { id: true, displayName: true } },
    },
  });

  return NextResponse.json(serializeEstablishmentBooking(booking), { status: 201 });
}
