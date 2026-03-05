/**
 * GET /api/establishment/payout-rules — список правил распределения.
 * POST /api/establishment/payout-rules — создать правило.
 * Требует: ESTABLISHMENT_ADMIN
 * Типы: establishment_share (процент заведению), charity (процент в фонд)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError } from "@/lib/api/helpers";
import { z } from "zod";

const createRuleSchema = z.object({
  name: z.string().trim().min(1, "Укажите название").max(100),
  type: z.enum(["establishment_share", "charity"], {
    errorMap: () => ({ message: "Тип: establishment_share или charity" }),
  }),
  value: z.number().min(0, "Значение не может быть отрицательным").max(100, "Процент не более 100"),
});

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const rules = await db.payoutRule.findMany({
    where: { establishmentId: auth.establishmentId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      value: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    rules: rules.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      value: Number(r.value),
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsed.ok) return parsed.response;

  const parseResult = createRuleSchema.safeParse(parsed.data);
  if (!parseResult.success) {
    const msg = parseResult.error.issues[0]?.message ?? "Неверные данные";
    return jsonError(400, msg);
  }

  const { name, type, value } = parseResult.data;

  if (type === "establishment_share") {
    const existing = await db.payoutRule.findFirst({
      where: {
        establishmentId: auth.establishmentId,
        type: "establishment_share",
      },
    });
    if (existing) {
      return jsonError(400, "Доля заведения уже задана. Отредактируйте существующее правило.");
    }
  }

  const rule = await db.payoutRule.create({
    data: {
      establishmentId: auth.establishmentId,
      name,
      type,
      value,
    },
    select: { id: true, name: true, type: true, value: true, createdAt: true },
  });

  return NextResponse.json(
    {
      id: rule.id,
      name: rule.name,
      type: rule.type,
      value: Number(rule.value),
      createdAt: rule.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
