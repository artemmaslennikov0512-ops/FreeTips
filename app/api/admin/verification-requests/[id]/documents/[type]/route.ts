/**
 * GET /api/admin/verification-requests/[id]/documents/[type] — скачать документ верификации.
 * После успешного чтения запись и файл удаляются — повторное скачивание невозможно.
 * Только SUPERADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { logWarn } from "@/lib/logger";

const ALLOWED_TYPES = ["passport_main", "passport_spread", "selfie"] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;
  const { id: requestId, type } = await params;

  if (!ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
    return NextResponse.json({ error: "Недопустимый тип документа" }, { status: 400 });
  }

  const doc = await db.verificationDocument.findFirst({
    where: { requestId, type },
    select: {
      id: true,
      filePath: true,
      request: {
        select: {
          user: {
            select: {
              uniqueId: true,
              tipLinks: { orderBy: { createdAt: "asc" }, take: 1, select: { slug: true } },
            },
          },
        },
      },
    },
  });
  if (!doc) {
    return NextResponse.json({ error: "Документ не найден" }, { status: 404 });
  }

  const fullPath = join(process.cwd(), "storage", doc.filePath);
  if (!existsSync(fullPath)) {
    return NextResponse.json({ error: "Файл не найден на диске" }, { status: 404 });
  }

  const buf = readFileSync(fullPath);
  const ext = doc.filePath.split(".").pop() ?? "jpg";
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const slug = doc.request.user.tipLinks[0]?.slug?.trim();
  const code =
    slug && /^[\d-]+$/.test(slug)
      ? slug
      : slug && /^[a-zA-Z0-9_-]+$/.test(slug)
        ? slug
        : String(doc.request.user.uniqueId);
  const disposition = `attachment; filename="${code}-${type}.${ext}"`;

  const del = await db.verificationDocument.deleteMany({ where: { id: doc.id } });
  if (del.count > 0) {
    try {
      if (existsSync(fullPath)) unlinkSync(fullPath);
    } catch (err) {
      logWarn("verification.document.download.unlink_failed", {
        filePath: doc.filePath,
        error: String(err),
      });
    }
  }

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-cache",
    },
  });
}
