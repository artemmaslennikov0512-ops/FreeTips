/**
 * GET /api/establishment/employees — список сотрудников заведения.
 * POST /api/establishment/employees — добавить сотрудника (с проверкой лимита).
 * Требует: ESTABLISHMENT_ADMIN, свой establishmentId
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";
import { hashPassword } from "@/lib/auth/password";
import { generateSlug } from "@/lib/generate-slug";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError } from "@/lib/api/helpers";
import { z } from "zod";
import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";
import { getWaiterPaygineSdRef } from "@/lib/payment/paygine-sd-ref";
import { effectiveTipRoutingMode, syncTipLinksForEstablishment } from "@/lib/tip-routing";

const createEmployeeSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(255),
  position: z.string().trim().max(100).optional().default(""),
});

async function generateUniqueQrIdentifier(establishmentId: string): Promise<string> {
  const est = await db.establishment.findUnique({
    where: { id: establishmentId },
    select: { uniqueSlug: true },
  });
  const reserved = new Set<string>();
  const us = est?.uniqueSlug?.trim();
  if (us) reserved.add(us);
  for (let i = 0; i < 20; i++) {
    const slug = generateSlug();
    if (reserved.has(slug)) continue;
    const [emp, link, slugEst] = await Promise.all([
      db.employee.findUnique({ where: { qrCodeIdentifier: slug } }),
      db.tipLink.findFirst({ where: { slug } }),
      db.establishment.findUnique({ where: { uniqueSlug: slug }, select: { id: true } }),
    ]);
    if (!emp && !link && !slugEst) return slug;
  }
  throw new Error("Не удалось сгенерировать уникальный slug");
}

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const baseUrl = getBaseUrlFromRequest(request);
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
      photoUrl: true,
      printCardPhotoUrl: true,
      createdAt: true,
    },
  });

  const reviewRows = await db.employeeReview.groupBy({
    by: ["employeeId"],
    _avg: { rating: true },
    _count: true,
    where: {
      employee: { establishmentId: auth.establishmentId },
    },
  });
  const reviewAgg = Object.fromEntries(
    reviewRows.map((x) => [
      x.employeeId,
      {
        avgRating: x._avg.rating != null ? Math.round(Number(x._avg.rating) * 10) / 10 : null,
        reviewsCount: x._count,
      },
    ]),
  );

  const estMeta = await db.establishment.findUnique({
    where: { id: auth.establishmentId },
    select: { uniqueSlug: true, tipRoutingMode: true },
  });

  const prefix = `${baseUrl.replace(/\/$/, "")}/api/establishment/employees/photo`;
  return NextResponse.json({
    establishmentUniqueSlug: estMeta?.uniqueSlug ?? null,
    tipRoutingMode: effectiveTipRoutingMode(estMeta?.tipRoutingMode),
    employees: employees.map((e) => {
      const rating = reviewAgg[e.id];
      return {
        id: e.id,
        name: e.name,
        position: e.position ?? "",
        coefficient: Number(e.coefficient),
        isActive: e.isActive,
        qrCodeIdentifier: e.qrCodeIdentifier,
        hasUser: !!e.userId,
        photoUrl: e.photoUrl ? `${prefix}/${e.id}?type=avatar` : null,
        printCardPhotoUrl: e.printCardPhotoUrl ? `${prefix}/${e.id}?type=print` : null,
        createdAt: e.createdAt.toISOString(),
        avgRating: rating?.avgRating ?? null,
        reviewsCount: rating?.reviewsCount ?? 0,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const establishment = await db.establishment.findUnique({
    where: { id: auth.establishmentId },
    select: {
      maxEmployeesCount: true,
      tipPoolUserId: true,
      _count: { select: { employees: true } },
    },
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
  const qrCodeIdentifier = await generateUniqueQrIdentifier(auth.establishmentId);

  let poolUserId = establishment.tipPoolUserId;

  const employee = await db.$transaction(async (tx) => {
    if (!poolUserId) {
      const est = await tx.establishment.findUnique({
        where: { id: auth.establishmentId },
        select: { id: true },
      });
      if (est) {
        const poolLogin = `pool-${est.id}`;
        const existingPool = await tx.user.findUnique({
          where: { login: poolLogin },
          select: { id: true },
        });
        if (existingPool) {
          poolUserId = existingPool.id;
          await tx.establishment.update({
            where: { id: auth.establishmentId },
            data: { tipPoolUserId: existingPool.id },
          });
        } else {
          const poolUser = await tx.user.create({
            data: {
              login: poolLogin,
              passwordHash: await hashPassword(randomBytes(32).toString("hex")),
              role: UserRole.RECIPIENT,
            },
          });
          poolUserId = poolUser.id;
          await tx.establishment.update({
            where: { id: auth.establishmentId },
            data: { tipPoolUserId: poolUser.id },
          });
        }
      }
    }

    const emp = await tx.employee.create({
      data: {
        establishmentId: auth.establishmentId,
        name,
        position: position || null,
        qrCodeIdentifier,
      },
    });
    if (poolUserId) {
      await tx.user.updateMany({
        where: { id: poolUserId, paygineSdRef: null },
        data: { paygineSdRef: getWaiterPaygineSdRef(poolUserId) },
      });
      await tx.tipLink.create({
        data: {
          userId: poolUserId,
          slug: qrCodeIdentifier,
          employeeId: emp.id,
        },
      });
    }
    return emp;
  });

  await syncTipLinksForEstablishment(auth.establishmentId);

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
