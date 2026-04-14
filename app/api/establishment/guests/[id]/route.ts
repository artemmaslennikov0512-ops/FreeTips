/**
 * GET / PATCH / DELETE /api/establishment/guests/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, jsonError } from "@/lib/api/helpers";

const patchGuestSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  phone: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.union([z.undefined(), z.string().max(40)]),
  ),
  email: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.union([z.undefined(), z.string().max(255).email()]),
  ),
  notes: z.preprocess(
    (v) => (v === "" || v == null ? undefined : String(v).trim()),
    z.union([z.undefined(), z.string().max(8000)]),
  ),
});

function serializeGuest(g: {
  id: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: g.id,
    displayName: g.displayName,
    phone: g.phone,
    email: g.email,
    notes: g.notes,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const guest = await db.establishmentGuest.findFirst({
    where: { id, establishmentId: auth.establishmentId },
  });
  if (!guest) {
    return NextResponse.json({ error: "Гость не найден" }, { status: 404 });
  }
  return NextResponse.json(serializeGuest(guest));
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const existing = await db.establishmentGuest.findFirst({
    where: { id, establishmentId: auth.establishmentId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Гость не найден" }, { status: 404 });
  }

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = patchGuestSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const d = body.data;
  if (
    d.displayName === undefined &&
    d.phone === undefined &&
    d.email === undefined &&
    d.notes === undefined
  ) {
    return jsonError(400, "Нет полей для обновления");
  }

  const guest = await db.establishmentGuest.update({
    where: { id },
    data: {
      ...(d.displayName !== undefined ? { displayName: d.displayName.trim() } : {}),
      ...(d.phone !== undefined ? { phone: d.phone ?? null } : {}),
      ...(d.email !== undefined ? { email: d.email ?? null } : {}),
      ...(d.notes !== undefined ? { notes: d.notes ?? null } : {}),
    },
  });

  return NextResponse.json(serializeGuest(guest));
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const deleted = await db.establishmentGuest.deleteMany({
    where: { id, establishmentId: auth.establishmentId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Гость не найден" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
