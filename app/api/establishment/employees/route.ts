/**
 * GET /api/establishment/employees — список сотрудников заведения.
 * POST /api/establishment/employees — добавить сотрудника (с проверкой лимита).
 * Требует: ESTABLISHMENT_ADMIN, свой establishmentId
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { generateSlug } from "@/lib/generate-slug";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError } from "@/lib/api/helpers";
import { z } from "zod";

const createEmployeeSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(255),
  position: z.string().trim().max(100).optional().default(""),
});

async function generateUniqueQrIdentifier(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const slug = generateSlug();
    const [emp, link] = await Promise.all([
      db.employee.findUnique({ where: { qrCodeIdentifier: slug } }),
      db.tipLink.findFirst({ where: { slug } }),
    ]);
    if (!emp && !link) return slug;
  }
  throw new Error("Не удалось сгенерировать уникальный slug");
}

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const employees = await db.employee.findMany({
    where: { establishmentId: auth.establishmentId },
    orderBy: { createdAt: "desc" },
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
    employees: employees.map((e) => ({
      id: e.id,
      name: e.name,
      position: e.position ?? "",
      coefficient: Number(e.coefficient),
      isActive: e.isActive,
      qrCodeIdentifier: e.qrCodeIdentifier,
      hasUser: !!e.userId,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const establishment = await db.establishment.findUnique({
    where: { id: auth.establishmentId },
    select: { maxEmployeesCount: true, _count: { select: { employees: true } } },
  });
  if (!establishment) {
    return NextResponse.json({ error: "Заведение не найдено" }, { status: 404 });
  }

  const max = establishment.maxEmployeesCount;
  const current = establishment._count.employees;
  if (max != null && current >= max) {
    return NextResponse.json(
      {
        error: `Достигнут лимит сотрудников (${max}). Увеличить лимит может суперадмин в разделе «Заведения».`,
      },
      { status: 403 },
    );
  }

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsed.ok) return parsed.response;

  const parseResult = createEmployeeSchema.safeParse(parsed.data);
  if (!parseResult.success) {
    const msg = parseResult.error.issues[0]?.message ?? "Неверные данные";
    return jsonError(400, msg);
  }

  const { name, position } = parseResult.data;
  const qrCodeIdentifier = await generateUniqueQrIdentifier();

  const employee = await db.employee.create({
    data: {
      establishmentId: auth.establishmentId,
      name,
      position: position || null,
      qrCodeIdentifier,
    },
  });

  return NextResponse.json(
    {
      id: employee.id,
      name: employee.name,
      position: employee.position ?? "",
      qrCodeIdentifier: employee.qrCodeIdentifier,
    },
    { status: 201 },
  );
}
