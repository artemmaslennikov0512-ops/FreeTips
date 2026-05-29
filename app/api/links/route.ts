/**
 * GET /api/links — список своих ссылок оплаты.
 * POST /api/links — создание одной или нескольких ссылок; slug в ответе = код официанта в /pay/{slug}.
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
const MAX_BULK_LINKS_PER_REQUEST = 300;

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

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_DEFAULT);
  if (!parsed.ok) return parsed.response;
  const rawData = parsed.data;
  const hasExplicitCount =
    typeof rawData === "object" &&
    rawData !== null &&
    Object.prototype.hasOwnProperty.call(rawData, "count");

  const validated = createLinkSchema.safeParse(parsed.data);
  if (!validated.success) {
    return jsonError(400, "Неверные данные", validated.error.issues);
  }

  const requestedCount = validated.data.count ?? 1;
  if (requestedCount < 1 || requestedCount > MAX_BULK_LINKS_PER_REQUEST) {
    return jsonError(400, `Количество ссылок должно быть от 1 до ${MAX_BULK_LINKS_PER_REQUEST}`);
  }

  // Обратная совместимость: старые клиенты без `count` получают прежнее поведение "вернуть существующую".
  if (!hasExplicitCount && requestedCount === 1 && typeof validated.data.slug !== "string") {
    const existing = await db.tipLink.findFirst({
      where: { userId },
      select: { id: true, slug: true, createdAt: true },
    });
    if (existing) {
      return NextResponse.json({ link: existing }, { status: 200 });
    }
  }

  if (typeof validated.data.slug === "string") {
    if (requestedCount !== 1) {
      return jsonError(400, "Нельзя одновременно передавать slug и count > 1");
    }
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

  const createdLinks: Array<{ id: string; slug: string; createdAt: Date }> = [];
  for (let idx = 0; idx < requestedCount; idx++) {
    let created = false;
    for (let attempt = 0; attempt < AUTO_SLUG_CREATE_ATTEMPTS; attempt++) {
      try {
        const link = await db.$transaction(async (tx) => {
          const slug = await allocatePersonalTipLinkSlug(tx);
          return tx.tipLink.create({
            data: { userId, slug },
            select: { id: true, slug: true, createdAt: true },
          });
        });
        createdLinks.push(link);
        created = true;
        break;
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
    if (!created) {
      return internalError("Не удалось создать ссылку");
    }
  }
  const normalizedLinks = createdLinks.map((l) => ({
    id: l.id,
    slug: l.slug,
    createdAt: l.createdAt.toISOString(),
  }));
  if (normalizedLinks.length === 1) {
    return NextResponse.json({ link: normalizedLinks[0] }, { status: 201 });
  }
  return NextResponse.json({ links: normalizedLinks, count: normalizedLinks.length }, { status: 201 });
}
