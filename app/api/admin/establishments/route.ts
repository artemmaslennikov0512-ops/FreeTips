/**
 * GET /api/admin/establishments — список заведений.
 * POST /api/admin/establishments — создать заведение и токен для регистрации управляющего.
 * Требует: SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import {
  generateRegistrationToken,
  hashRegistrationToken,
  getRegistrationTokenExpiresAt,
} from "@/lib/auth/registration-token";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError } from "@/lib/api/helpers";
import { z } from "zod";
import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";

const createEstablishmentSchema = z.object({
  name: z.string().trim().min(1, "Укажите название").max(255),
  address: z.string().trim().max(2000).optional().default(""),
  phone: z.string().trim().max(50).optional().default(""),
  uniqueSlug: z
    .string()
    .trim()
    .min(1, "Укажите slug для URL")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Только латиница в нижнем регистре, цифры и дефис"),
  maxEmployeesCount: z.number().int().min(0).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const list = await db.establishment.findMany({
    orderBy: { createdAt: "desc" },
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

  return NextResponse.json({
    establishments: list.map((e) => ({
      id: e.id,
      name: e.name,
      address: e.address ?? "",
      phone: e.phone ?? "",
      uniqueSlug: e.uniqueSlug,
      maxEmployeesCount: e.maxEmployeesCount,
      createdAt: e.createdAt.toISOString(),
      employeesCount: e._count.employees,
      adminsCount: e._count.users,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsed.ok) return parsed.response;

  const parseResult = createEstablishmentSchema.safeParse(parsed.data);
  if (!parseResult.success) {
    const msg = parseResult.error.issues[0]?.message ?? "Неверные данные";
    return jsonError(400, msg);
  }

  const { name, address, phone, uniqueSlug, maxEmployeesCount } = parseResult.data;

  const existing = await db.establishment.findUnique({ where: { uniqueSlug } });
  if (existing) {
    return NextResponse.json(
      { error: "Заведение с таким slug уже существует" },
      { status: 409 },
    );
  }

  const token = generateRegistrationToken();
  const tokenHash = hashRegistrationToken(token);
  const expiresAt = getRegistrationTokenExpiresAt();
  const baseUrl = getBaseUrlFromRequest(request.nextUrl.origin);

  const establishment = await db.$transaction(async (tx) => {
    const est = await tx.establishment.create({
      data: {
        name,
        address: address || null,
        phone: phone || null,
        uniqueSlug,
        maxEmployeesCount: maxEmployeesCount ?? null,
      },
    });
    const poolLogin = `pool-${est.id}`;
    const poolPasswordHash = await hashPassword(randomBytes(32).toString("hex"));
    const poolUser = await tx.user.create({
      data: {
        login: poolLogin,
        passwordHash: poolPasswordHash,
        role: UserRole.RECIPIENT,
      },
    });
    await tx.establishment.update({
      where: { id: est.id },
      data: { tipPoolUserId: poolUser.id },
    });
    await tx.registrationToken.create({
      data: {
        tokenHash,
        createdById: auth.user.userId,
        expiresAt,
        establishmentId: est.id,
      },
    });
    return { ...est, tipPoolUserId: poolUser.id };
  });

  const link = `${baseUrl}/register?token=${encodeURIComponent(token)}`;

  return NextResponse.json(
    {
      establishment: {
        id: establishment.id,
        name: establishment.name,
        uniqueSlug: establishment.uniqueSlug,
        maxEmployeesCount: establishment.maxEmployeesCount,
      },
      registrationLink: link,
      expiresAt: expiresAt.toISOString(),
    },
    { status: 201 },
  );
}
