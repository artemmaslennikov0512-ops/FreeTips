/**
 * GET /api/establishment/bookings/[id]
 * PATCH /api/establishment/bookings/[id]
 * DELETE /api/establishment/bookings/[id] — удалить запись (жёстко).
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
  moscowHmFromUtcDate,
  moscowYmdFromUtcDate,
  normalizeEndsAfterStart,
} from "@/lib/establishment-booking-moscow";
import { serializeEstablishmentBooking } from "@/lib/establishment-booking-serialize";

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 14 * 60 * 60 * 1000;

const patchBookingSchema = z.object({
  guestName: z.string().trim().min(1).max(120).optional(),
  guestPhone: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.union([z.undefined(), z.string().max(40)]),
  ),
  guestEmail: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.union([z.undefined(), z.string().max(255).email()]),
  ),
  partySize: z.number().int().min(1).max(99).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  tableId: z.union([z.string().min(1).max(64), z.literal(""), z.null()]).optional(),
  guestId: z.union([z.string().min(1), z.literal(""), z.null()]).optional(),
  notes: z.union([z.string().trim().max(500), z.literal(""), z.null()]).optional(),
  status: z.nativeEnum(EstablishmentBookingStatus).optional(),
});

function normalizeOptionalString(v: string | null | undefined): string | null {
  if (v == null || v === "") return null;
  return v.trim();
}

async function assertTableInEstablishment(establishmentId: string, tableId: string) {
  return db.establishmentTable.findFirst({
    where: { id: tableId, hall: { establishmentId } },
    select: { id: true, capacity: true },
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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const booking = await db.establishmentBooking.findFirst({
    where: { id, establishmentId: auth.establishmentId },
    include: {
      table: { select: { id: true, label: true, capacity: true, hall: { select: { name: true } } } },
      guest: { select: { id: true, displayName: true } },
    },
  });
  if (!booking) {
    return NextResponse.json({ error: "Бронь не найдена" }, { status: 404 });
  }
  return NextResponse.json(serializeEstablishmentBooking(booking));
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const existing = await db.establishmentBooking.findFirst({
    where: { id, establishmentId: auth.establishmentId },
    include: {
      table: { select: { id: true, label: true, capacity: true, hall: { select: { name: true } } } },
      guest: { select: { id: true, displayName: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Бронь не найдена" }, { status: 404 });
  }

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = patchBookingSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const d = body.data;
  if (
    d.guestName === undefined &&
    d.guestPhone === undefined &&
    d.guestEmail === undefined &&
    d.partySize === undefined &&
    d.date === undefined &&
    d.startTime === undefined &&
    d.endTime === undefined &&
    d.tableId === undefined &&
    d.guestId === undefined &&
    d.notes === undefined &&
    d.status === undefined
  ) {
    return jsonError(400, "Нет полей для обновления");
  }

  let startsAt = existing.startsAt;
  let endsAt = existing.endsAt;

  if (d.date !== undefined || d.startTime !== undefined || d.endTime !== undefined) {
    const dateStr = d.date ?? moscowYmdFromUtcDate(existing.startsAt);
    const startHm = d.startTime ?? moscowHmFromUtcDate(existing.startsAt);
    const endHm = d.endTime ?? moscowHmFromUtcDate(existing.endsAt);

    const s = combineMoscowDateAndTime(dateStr, startHm);
    const e = combineMoscowDateAndTime(dateStr, endHm);
    if (!s || !e) {
      return jsonError(400, "Некорректные дата или время");
    }
    startsAt = s;
    endsAt = normalizeEndsAfterStart(startsAt, e);
    if (endsAt.getTime() - startsAt.getTime() < MIN_DURATION_MS) {
      return jsonError(400, "Интервал брони не короче 15 минут");
    }
    if (endsAt.getTime() - startsAt.getTime() > MAX_DURATION_MS) {
      return jsonError(400, "Интервал брони не длиннее 14 часов");
    }
  }

  let tableId: string | null = existing.tableId;
  if (d.tableId !== undefined) {
    tableId = d.tableId === "" || d.tableId === null ? null : d.tableId;
  }

  const partySize = d.partySize ?? existing.partySize;

  if (tableId) {
    const table = await assertTableInEstablishment(auth.establishmentId, tableId);
    if (!table) {
      return jsonError(400, "Стол не найден");
    }
    if (partySize > table.capacity) {
      return jsonError(400, `Число гостей не больше вместимости стола (${table.capacity})`);
    }
    const overlap = await hasTableOverlap(auth.establishmentId, tableId, startsAt, endsAt, id);
    if (overlap) {
      return jsonError(409, "На этот стол уже есть пересекающаяся бронь");
    }
  }

  let nextGuestId: string | null | undefined = undefined;
  if (d.guestId !== undefined) {
    if (d.guestId === "" || d.guestId === null) {
      nextGuestId = null;
    } else {
      const g = await db.establishmentGuest.findFirst({
        where: { id: d.guestId, establishmentId: auth.establishmentId },
      });
      if (!g) {
        return jsonError(400, "Гость не найден");
      }
      nextGuestId = g.id;
    }
  }

  const updated = await db.establishmentBooking.update({
    where: { id },
    data: {
      ...(d.guestName !== undefined ? { guestName: d.guestName.trim() } : {}),
      ...(d.guestPhone !== undefined ? { guestPhone: normalizeOptionalString(d.guestPhone as string) } : {}),
      ...(d.guestEmail !== undefined ? { guestEmail: normalizeOptionalString(d.guestEmail as string) } : {}),
      ...(d.partySize !== undefined ? { partySize: d.partySize } : {}),
      ...(d.date !== undefined || d.startTime !== undefined || d.endTime !== undefined
        ? { startsAt, endsAt }
        : {}),
      ...(d.tableId !== undefined ? { tableId } : {}),
      ...(nextGuestId !== undefined ? { guestId: nextGuestId } : {}),
      ...(d.notes !== undefined ? { notes: normalizeOptionalString(d.notes as string) } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
    },
    include: {
      table: { select: { id: true, label: true, capacity: true, hall: { select: { name: true } } } },
      guest: { select: { id: true, displayName: true } },
    },
  });

  return NextResponse.json(serializeEstablishmentBooking(updated));
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const deleted = await db.establishmentBooking.deleteMany({
    where: { id, establishmentId: auth.establishmentId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Бронь не найдена" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
