/**
 * GET /api/links — список своих ссылок (в MVP одна).
 * POST /api/links — создание ссылки; если уже есть — возврат существующей.
 * Требует: Authorization: Bearer <access_token>
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrApiKey } from "@/lib/auth-or-api-key";
import { db } from "@/lib/db";
import { createLinkSchema } from "@/lib/validations";
import { generateSlug } from "@/lib/generate-slug";
import { parseJsonWithLimit, MAX_BODY_SIZE_DEFAULT, jsonError, internalError } from "@/lib/api/helpers";

const MAX_SLUG_RETRIES = 3;

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
  let slug: string;

  if (validated.success && typeof validated.data.slug === "string") {
    slug = validated.data.slug.toLowerCase().trim();
    const conflict = await db.tipLink.findUnique({ where: { slug } });
    if (conflict) {
      return NextResponse.json(
        { error: "Ссылка с таким slug уже существует" },
        { status: 409 },
      );
    }
  } else if (validated.success) {
    slug = generateSlug();
    for (let i = 0; i < MAX_SLUG_RETRIES; i++) {
      const conflict = await db.tipLink.findUnique({ where: { slug } });
      if (!conflict) break;
      if (i === MAX_SLUG_RETRIES - 1) {
        return internalError("Не удалось сгенерировать уникальный slug");
      }
      slug = generateSlug();
    }
  } else {
    return jsonError(400, "Неверные данные", validated.error.issues);
  }

  const link = await db.tipLink.create({
    data: { userId, slug },
    select: { id: true, slug: true, createdAt: true },
  });

  return NextResponse.json({ link }, { status: 201 });
}
