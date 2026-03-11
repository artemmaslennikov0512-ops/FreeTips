/**
 * GET /api/establishment/employees/photo/[id]?type=avatar|print — отдать фото сотрудника.
 * Публичный (для отображения на странице оплаты). type=avatar — профиль/ЛК, type=print — для печати.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id: employeeId } = await params;
  const type = request.nextUrl.searchParams.get("type") === "print" ? "print" : "avatar";

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: { photoUrl: true, printCardPhotoUrl: true },
  });
  if (!employee) {
    return new NextResponse(null, { status: 404 });
  }

  const relativePath = type === "print" ? employee.printCardPhotoUrl : employee.photoUrl;
  if (!relativePath?.trim()) {
    return new NextResponse(null, { status: 404 });
  }

  const fullPath = join(process.cwd(), "storage", relativePath);
  if (!existsSync(fullPath)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const buf = readFileSync(fullPath);
    const ext = relativePath.split(".").pop() ?? "jpg";
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
