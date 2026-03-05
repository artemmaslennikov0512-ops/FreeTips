/**
 * PATCH /api/establishment/payout-rules/[id] — обновить правило.
 * DELETE /api/establishment/payout-rules/[id] — удалить правило.
 * Требует: ESTABLISHMENT_ADMIN, своё заведение
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError } from "@/lib/api/helpers";
import { z } from "zod";

const updateRuleSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  value: z.number().min(0).max(100).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const { id } = await params;

  const rule = await db.payoutRule.findFirst({
    where: { id, establishmentId: auth.establishmentId },
  });
  if (!rule) {
    return NextResponse.json({ error: "Правило не найдено" }, { status: 404 });
  }

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsed.ok) return parsed.response;

  const parseResult = updateRuleSchema.safeParse(parsed.data);
  if (!parseResult.success) {
    return jsonError(400, "Неверные данные");
  }

  const updated = await db.payoutRule.update({
    where: { id },
    data: {
      ...(parseResult.data.name != null && { name: parseResult.data.name }),
      ...(parseResult.data.value != null && { value: parseResult.data.value }),
    },
    select: { id: true, name: true, type: true, value: true, createdAt: true },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    type: updated.type,
    value: Number(updated.value),
    createdAt: updated.createdAt.toISOString(),
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const { id } = await params;

  const rule = await db.payoutRule.findFirst({
    where: { id, establishmentId: auth.establishmentId },
  });
  if (!rule) {
    return NextResponse.json({ error: "Правило не найдено" }, { status: 404 });
  }

  await db.payoutRule.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
