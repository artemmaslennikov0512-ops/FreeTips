/**
 * GET /api/admin/establishments/[id] — одно заведение.
 * PATCH /api/admin/establishments/[id] — обновить (название, лимит и т.д.).
 * Требует: SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError } from "@/lib/api/helpers";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  address: z.string().trim().max(2000).optional(),
  phone: z.string().trim().max(50).optional(),
  uniqueSlug: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  maxEmployeesCount: z.number().int().min(0).nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const { id } = await params;
  const establishment = await db.establishment.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      uniqueSlug: true,
      maxEmployeesCount: true,
      createdAt: true,
      _count: { select: { employees: true, users: true } },
    },
  });

  if (!establishment) {
    return NextResponse.json({ error: "Заведение не найдено" }, { status: 404 });
  }

  return NextResponse.json({
    id: establishment.id,
    name: establishment.name,
    address: establishment.address ?? "",
    phone: establishment.phone ?? "",
    uniqueSlug: establishment.uniqueSlug,
    maxEmployeesCount: establishment.maxEmployeesCount,
    createdAt: establishment.createdAt.toISOString(),
    employeesCount: establishment._count.employees,
    adminsCount: establishment._count.users,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const { id } = await params;
  const establishment = await db.establishment.findUnique({ where: { id } });
  if (!establishment) {
    return NextResponse.json({ error: "Заведение не найдено" }, { status: 404 });
  }

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsed.ok) return parsed.response;

  const parseResult = patchSchema.safeParse(parsed.data);
  if (!parseResult.success) {
    const msg = parseResult.error.issues[0]?.message ?? "Неверные данные";
    return jsonError(400, msg);
  }

  const data = parseResult.data;
  if (data.uniqueSlug && data.uniqueSlug !== establishment.uniqueSlug) {
    const existing = await db.establishment.findUnique({
      where: { uniqueSlug: data.uniqueSlug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Заведение с таким slug уже существует" },
        { status: 409 },
      );
    }
  }

  const updated = await db.establishment.update({
    where: { id },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.uniqueSlug != null && { uniqueSlug: data.uniqueSlug }),
      ...(data.maxEmployeesCount !== undefined && {
        maxEmployeesCount: data.maxEmployeesCount,
      }),
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    uniqueSlug: updated.uniqueSlug,
    maxEmployeesCount: updated.maxEmployeesCount,
  });
}
