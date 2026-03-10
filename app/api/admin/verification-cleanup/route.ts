/**
 * POST /api/admin/verification-cleanup — удаление документов верификации,
 * выгруженных более 24 часов назад (downloadedAt установлен при выгрузке админом).
 * Только SUPERADMIN. Вызывать по крону раз в сутки.
 */

import { NextRequest, NextResponse } from "next/server";
import { unlinkSync, existsSync } from "fs";
import { join } from "path";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { logInfo, logWarn } from "@/lib/logger";

const HOURS_AGO = 24;

export async function POST(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const cutoff = new Date(Date.now() - HOURS_AGO * 60 * 60 * 1000);
  const toDelete = await db.verificationDocument.findMany({
    where: { downloadedAt: { lt: cutoff, not: null } },
    select: { id: true, filePath: true },
  });

  let deleted = 0;
  for (const doc of toDelete) {
    const fullPath = join(process.cwd(), "storage", doc.filePath);
    try {
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
        deleted++;
      }
    } catch (err) {
      logWarn("verification.cleanup.unlink_failed", { filePath: doc.filePath, error: String(err) });
    }
    await db.verificationDocument.delete({ where: { id: doc.id } });
  }

  logInfo("verification.cleanup.done", { count: toDelete.length, filesDeleted: deleted });
  return NextResponse.json({ deleted: toDelete.length, filesDeleted: deleted });
}
