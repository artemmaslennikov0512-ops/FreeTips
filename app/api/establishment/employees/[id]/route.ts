/**
 * PATCH /api/establishment/employees/[id] — обновить сотрудника (деактивация, коэффициент и т.д.).
 * Требует: ESTABLISHMENT_ADMIN, свой establishmentId
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError } from "@/lib/api/helpers";
import { z } from "zod";

const updateEmployeeSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().trim().min(1).max(255).optional(),
  position: z.string().trim().max(100).optional().nullable(),
  coefficient: z.number().min(0.01).max(100).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const { id: employeeId } = await params;

  const employee = await db.employee.findFirst({
    where: { id: employeeId, establishmentId: auth.establishmentId },
  });
  if (!employee) {
    return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
  }

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsed.ok) return parsed.response;

  const parseResult = updateEmployeeSchema.safeParse(parsed.data);
  if (!parseResult.success) {
    const msg = parseResult.error.issues[0]?.message ?? "Неверные данные";
    return jsonError(400, msg);
  }

  const data: { isActive?: boolean; name?: string; position?: string | null; coefficient?: { set: number } } = {};
  if (parseResult.data.isActive !== undefined) data.isActive = parseResult.data.isActive;
  if (parseResult.data.name !== undefined) data.name = parseResult.data.name;
  if (parseResult.data.position !== undefined) data.position = parseResult.data.position;
  if (parseResult.data.coefficient !== undefined) data.coefficient = { set: parseResult.data.coefficient };

  const updated = await db.employee.update({
    where: { id: employeeId },
    data,
    select: {
      id: true,
      name: true,
      position: true,
      coefficient: true,
      isActive: true,
      qrCodeIdentifier: true,
      userId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    position: updated.position ?? "",
    coefficient: Number(updated.coefficient),
    isActive: updated.isActive,
    qrCodeIdentifier: updated.qrCodeIdentifier,
    hasUser: !!updated.userId,
    createdAt: updated.createdAt.toISOString(),
  });
}
