/**
 * GET /api/establishment/guests — список гостей заведения.
 * POST /api/establishment/guests — создать карточку гостя.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit } from "@/lib/api/helpers";

const createGuestSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
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

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const q = request.nextUrl.searchParams.get("q")?.trim();
  const list = await db.establishmentGuest.findMany({
    where: {
      establishmentId: auth.establishmentId,
      ...(q
        ? {
            OR: [
              { displayName: { contains: q, mode: "insensitive" as const } },
              { phone: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ displayName: "asc" }],
    take: 200,
  });

  return NextResponse.json({ guests: list.map(serializeGuest) });
}

export async function POST(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const parsed = await parseJsonWithLimit(request);
  if (!parsed.ok) return parsed.response;

  const body = createGuestSchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const guest = await db.establishmentGuest.create({
    data: {
      establishmentId: auth.establishmentId,
      displayName: body.data.displayName.trim(),
      phone: body.data.phone ?? null,
      email: body.data.email ?? null,
      notes: body.data.notes ?? null,
    },
  });

  return NextResponse.json(serializeGuest(guest), { status: 201 });
}
