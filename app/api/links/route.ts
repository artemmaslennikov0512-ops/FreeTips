/**
 * GET /api/links — список своих ссылок оплаты (в MVP одна).
 * POST /api/links — создание ссылки; slug в ответе = код официанта в /pay/{slug}. Если ссылка уже есть — возврат существующей.
 * Требует: Authorization: Bearer <access_token>
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrApiKey } from "@/lib/auth-or-api-key";
import { db } from "@/lib/db";
import { createLinkSchema } from "@/lib/validations";
import {
  allocatePersonalTipLinkSlug,
  WaiterQrIdentifierExhaustedError,
} from "@/lib/waiter-qr-identifier";
import { parseJsonWithLimit, MAX_BODY_SIZE_DEFAULT, jsonError, internalError } from "@/lib/api/helpers";
import { Prisma } from "@prisma/client";

const AUTO_SLUG_CREATE_ATTEMPTS = 5;

function isUniqueConstraintError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;

  const links = await db.tipLink.findMany({
    where: { userId: auth.userId },
    select: { id: true, slug: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ links });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;

  const userId = auth.userId;

  const existing = await db.tipLink.findFirst({
    where: { userId },
    select: { id: true, slug: true, createdAt: true },
  });
  if (existing) {
    return NextResponse.json({ link: existing }, { status: 200 });
  }

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_DEFAULT);
  if (!parsed.ok) return parsed.response;

  const validated = createLinkSchema.safeParse(parsed.data);

  if (validated.success && typeof validated.data.slug === "string") {
    const slug = validated.data.slug.toLowerCase().trim();
    const conflict = await db.tipLink.findUnique({ where: { slug } });
    if (conflict) {
      return NextResponse.json(
        { error: "Такой код официанта уже занят" },
        { status: 409 },
      );
    }
    const link = await db.tipLink.create({
      data: { userId, slug },
      select: { id: true, slug: true, createdAt: true },
    });
    return NextResponse.json({ link }, { status: 201 });
  }

  if (validated.success) {
    for (let attempt = 0; attempt < AUTO_SLUG_CREATE_ATTEMPTS; attempt++) {
      try {
        const link = await db.$transaction(async (tx) => {
          const slug = await allocatePersonalTipLinkSlug(tx);
          return tx.tipLink.create({
            data: { userId, slug },
            select: { id: true, slug: true, createdAt: true },
          });
        });
        return NextResponse.json({ link }, { status: 201 });
      } catch (e) {
        if (e instanceof WaiterQrIdentifierExhaustedError) {
          return internalError(e.message);
        }
        if (isUniqueConstraintError(e) && attempt < AUTO_SLUG_CREATE_ATTEMPTS - 1) {
          continue;
        }
        throw e;
      }
    }
    return internalError("Не удалось создать ссылку");
  }

  return jsonError(400, "Неверные данные", validated.error.issues);
}
