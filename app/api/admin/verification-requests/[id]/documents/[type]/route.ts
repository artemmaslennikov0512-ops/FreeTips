/**
 * GET /api/admin/verification-requests/[id]/documents/[type] — скачать документ верификации.
 * После выгрузки устанавливается downloadedAt; через 24 ч файлы подлежат автоудалению.
 * Только SUPERADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";

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
    select: { id: true, filePath: true },
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
  const disposition = `attachment; filename="${type}.${ext}"`;

  await db.verificationDocument.update({
    where: { id: doc.id },
    data: { downloadedAt: new Date() },
  });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-cache",
    },
  });
}
