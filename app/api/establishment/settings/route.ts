/**
 * GET /api/establishment/settings — настройки заведения (бренд) для ЛК.
 * PATCH /api/establishment/settings — обновить бренд (logoUrl, primaryColor, secondaryColor).
 * Требует: ESTABLISHMENT_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError } from "@/lib/api/helpers";
import { z } from "zod";

const updateSettingsSchema = z.object({
  logoUrl: z
    .union([z.string().trim().max(512), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v))
    .refine((v) => v === null || /^https?:\/\/.+/.test(v), "Некорректный URL"),
  primaryColor: z.string().trim().max(20).optional().nullable(),
  secondaryColor: z.string().trim().max(20).optional().nullable(),
});

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const est = await db.establishment.findUnique({
    where: { id: auth.establishmentId },
    select: { logoUrl: true, primaryColor: true, secondaryColor: true },
  });
  if (!est) {
    return NextResponse.json({ error: "Заведение не найдено" }, { status: 404 });
  }
  return NextResponse.json({
    logoUrl: est.logoUrl ?? null,
    primaryColor: est.primaryColor ?? null,
    secondaryColor: est.secondaryColor ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsed.ok) return parsed.response;

  const parseResult = updateSettingsSchema.safeParse(parsed.data);
  if (!parseResult.success) {
    const msg = parseResult.error.issues[0]?.message ?? "Неверные данные";
    return jsonError(400, msg);
  }

  const data: { logoUrl?: string | null; primaryColor?: string | null; secondaryColor?: string | null } = {};
  if (parseResult.data.logoUrl !== undefined) data.logoUrl = parseResult.data.logoUrl;
  if (parseResult.data.primaryColor !== undefined) data.primaryColor = parseResult.data.primaryColor;
  if (parseResult.data.secondaryColor !== undefined) data.secondaryColor = parseResult.data.secondaryColor;

  await db.establishment.update({
    where: { id: auth.establishmentId },
    data,
  });

  const updated = await db.establishment.findUnique({
    where: { id: auth.establishmentId },
    select: { logoUrl: true, primaryColor: true, secondaryColor: true },
  });
  return NextResponse.json({
    logoUrl: updated?.logoUrl ?? null,
    primaryColor: updated?.primaryColor ?? null,
    secondaryColor: updated?.secondaryColor ?? null,
  });
}
