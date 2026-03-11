/**
 * POST /api/profile/employee-photo — загрузка своего фото официантом (ЛК).
 * FormData: file (обязательно), type = "avatar" | "print".
 * avatar — для страницы оплаты и ЛК (рекомендуется ≥200×200 px).
 * print — для карточки печати (рекомендуется ≥150×150 px).
 * Требует: авторизация, роль EMPLOYEE (привязка к сотруднику заведения).
 */

import { NextRequest, NextResponse } from "next/server";
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { logError } from "@/lib/logger";

const ALLOWED_TYPES = ["avatar", "print"] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

function getExt(mime: string, fileName?: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  const lower = (fileName ?? "").toLowerCase();
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".webp")) return "webp";
  return "jpg";
}

function isAllowedMime(mime: string, fileName: string): boolean {
  if (ALLOWED_MIMES.includes(mime)) return true;
  if (!mime || mime === "application/octet-stream") {
    const lower = fileName.toLowerCase();
    return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp");
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;
    const userId = auth.userId;

    const [user, employee] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { role: true },
      }),
      db.employee.findFirst({
        where: { userId },
        select: { id: true, establishmentId: true, photoUrl: true, printCardPhotoUrl: true },
      }),
    ]);

    if (!user || user.role !== "EMPLOYEE" || !employee) {
      return NextResponse.json(
        { error: "Загрузка фото доступна только сотрудникам заведения" },
        { status: 403 },
      );
    }

    const employeeId = employee.id;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
    }

    const type = formData.get("type")?.toString()?.trim();
    const file = formData.get("file");

    if (!type || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[0])) {
      return NextResponse.json(
        { error: 'Укажите type: "avatar" (профиль и страница оплаты) или "print" (карточка для печати)' },
        { status: 400 },
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Приложите файл изображения" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Размер файла не более 5 МБ" }, { status: 400 });
    }
    if (!isAllowedMime(file.type, file.name)) {
      return NextResponse.json(
        { error: "Допустимые форматы: JPEG, PNG, WebP" },
        { status: 400 },
      );
    }

    const storageRoot = join(process.cwd(), "storage");
    const relDir = join("establishments", employee.establishmentId, "employees", employeeId);
    const storageDir = join(storageRoot, relDir);
    if (!existsSync(storageRoot)) mkdirSync(storageRoot, { recursive: true });
    if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true });

    const ext = getExt(file.type, file.name);
    const fileName = type === "avatar" ? `avatar.${ext}` : `print.${ext}`;
    const filePath = join(storageDir, fileName);

    const oldPath = type === "avatar" ? employee.photoUrl : employee.printCardPhotoUrl;
    if (oldPath) {
      const oldFull = join(storageRoot, oldPath);
      if (existsSync(oldFull)) {
        try {
          unlinkSync(oldFull);
        } catch {
          // ignore
        }
      }
    }

    try {
      const buf = Buffer.from(await file.arrayBuffer());
      writeFileSync(filePath, buf);
    } catch (err) {
      logError("profile.employee-photo.upload.write.error", err, { employeeId, type });
      return NextResponse.json(
        { error: "Не удалось сохранить файл. Проверьте права на каталог storage." },
        { status: 500 },
      );
    }

    const relativePath = join(relDir, fileName).replace(/\\/g, "/");
    await db.employee.update({
      where: { id: employeeId },
      data: type === "avatar" ? { photoUrl: relativePath } : { printCardPhotoUrl: relativePath },
    });

    return NextResponse.json({ ok: true, path: relativePath });
  } catch (err) {
    logError("profile.employee-photo.upload.error", err, {});
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }
}
