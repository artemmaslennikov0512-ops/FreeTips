/**
 * GET /api/profile/photo/[userId] — отдать фото получателя (RECIPIENT) для страницы оплаты.
 * Публичный: используется в img на странице оплаты. Отдаёт только если у пользователя есть profilePhotoUrl.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { db } from "@/lib/db";

type Params = { params: Promise<{ userId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { userId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { profilePhotoUrl: true },
  });
  if (!user?.profilePhotoUrl?.trim()) {
    return new NextResponse(null, { status: 404 });
  }

  const fullPath = join(process.cwd(), "storage", user.profilePhotoUrl);
  if (!existsSync(fullPath)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const buf = readFileSync(fullPath);
    const ext = user.profilePhotoUrl.split(".").pop() ?? "jpg";
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
