/**
 * GET /api/admin/verification-requests/[id]/documents/zip — архив всех фото заявки в папке с именем кода официанта.
 * После успешной выгрузки записи документов и файлы удаляются (как при поочерёдном скачивании).
 * Только SUPERADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import JSZip from "jszip";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { logWarn } from "@/lib/logger";

const TYPE_ORDER = ["passport_spread", "selfie", "passport_main"] as const;

function folderNameForUser(slug: string | null | undefined, uniqueId: number): string {
  const s = (slug ?? "").trim();
  if (s && /^[\d-]+$/.test(s)) return s;
  if (s && /^[a-zA-Z0-9_-]+$/.test(s)) return s;
  return String(uniqueId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;
  const { id: requestId } = await params;

  const vr = await db.verificationRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      documents: { select: { id: true, type: true, filePath: true } },
      user: {
        select: {
          uniqueId: true,
          tipLinks: { orderBy: { createdAt: "asc" }, take: 1, select: { slug: true } },
        },
      },
    },
  });

  if (!vr || vr.documents.length === 0) {
    return NextResponse.json({ error: "Нет документов для выгрузки" }, { status: 404 });
  }

  const folder = folderNameForUser(vr.user.tipLinks[0]?.slug, vr.user.uniqueId);
  const zip = new JSZip();
  const root = zip.folder(folder);
  if (!root) {
    return NextResponse.json({ error: "Не удалось сформировать архив" }, { status: 500 });
  }

  const cwd = process.cwd();
  const order = new Map<string, number>(TYPE_ORDER.map((t, i) => [t, i]));
  const sorted = [...vr.documents].sort((a, b) => (order.get(a.type) ?? 99) - (order.get(b.type) ?? 99));

  for (const doc of sorted) {
    const fullPath = join(cwd, "storage", doc.filePath);
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: `Файл не найден на диске: ${doc.type}` }, { status: 404 });
    }
    const buf = readFileSync(fullPath);
    const ext = doc.filePath.split(".").pop() ?? "jpg";
    root.file(`${doc.type}.${ext}`, buf);
  }

  const body = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const ids = vr.documents.map((d) => d.id);
  const del = await db.verificationDocument.deleteMany({ where: { id: { in: ids } } });
  if (del.count > 0) {
    for (const doc of vr.documents) {
      const fullPath = join(cwd, "storage", doc.filePath);
      try {
        if (existsSync(fullPath)) unlinkSync(fullPath);
      } catch (err) {
        logWarn("verification.document.zip.unlink_failed", {
          filePath: doc.filePath,
          error: String(err),
        });
      }
    }
  }

  const zipName = `${folder}-verification.zip`;
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
