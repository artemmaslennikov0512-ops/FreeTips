/**
 * POST /api/verification/upload — загрузка документа верификации (фото паспорта, селфи).
 * FormData: requestId, type (passport_main | passport_spread | selfie), file.
 * Только для авторизованного пользователя (Bearer).
 */

import { NextRequest, NextResponse } from "next/server";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { logError } from "@/lib/logger";

const ALLOWED_TYPES = ["passport_main", "passport_spread", "selfie"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
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
    const userId = auth.user.userId;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
    }

    const requestId = formData.get("requestId")?.toString()?.trim();
    const type = formData.get("type")?.toString()?.trim();
    const file = formData.get("file");

    if (!requestId || !type || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[0])) {
      return NextResponse.json(
        { error: "Укажите requestId и type (passport_main, passport_spread или selfie)" },
        { status: 400 },
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Приложите файл изображения" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Размер файла не более 10 МБ" }, { status: 400 });
    }
    if (!isAllowedMime(file.type, file.name)) {
      return NextResponse.json(
        { error: "Допустимые форматы: JPEG, PNG, WebP" },
        { status: 400 },
      );
    }

    const verificationRequest = await db.verificationRequest.findFirst({
      where: { id: requestId, userId, status: "PENDING" },
      select: { id: true },
    });
    if (!verificationRequest) {
      return NextResponse.json({ error: "Заявка не найдена или уже рассмотрена" }, { status: 404 });
    }

    const storageRoot = join(process.cwd(), "storage");
    const storageDir = join(storageRoot, "verification", requestId);
    if (!existsSync(storageRoot)) {
      mkdirSync(storageRoot, { recursive: true });
    }
    if (!existsSync(storageDir)) {
      mkdirSync(storageDir, { recursive: true });
    }
    const ext = getExt(file.type, file.name);
    const fileName = `${type}.${ext}`;
    const filePath = join(storageDir, fileName);

    try {
      const buf = Buffer.from(await file.arrayBuffer());
      writeFileSync(filePath, buf);
    } catch (err) {
      logError("verification.upload.write.error", err, { requestId, type, storageDir });
      return NextResponse.json(
        { error: "Не удалось сохранить файл. Проверьте права на каталог storage." },
        { status: 500 },
      );
    }

    const relativePath = join("verification", requestId, fileName).replace(/\\/g, "/");

    const existing = await db.verificationDocument.findFirst({
      where: { requestId, type },
      select: { id: true, filePath: true },
    });
    if (existing) {
      await db.verificationDocument.update({
        where: { id: existing.id },
        data: { filePath: relativePath },
      });
    } else {
      await db.verificationDocument.create({
        data: { requestId, type, filePath: relativePath },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("verification.upload.error", err, {});
    const message = err instanceof Error ? err.message : "Ошибка загрузки";
    return NextResponse.json(
      { error: "Ошибка загрузки. Убедитесь, что миграции БД применены (npx prisma migrate deploy)." },
      { status: 500 },
    );
  }
}
