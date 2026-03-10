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
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

function getExt(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: NextRequest) {
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
  if (!ALLOWED_MIMES.includes(file.type)) {
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

  const storageDir = join(process.cwd(), "storage", "verification", requestId);
  if (!existsSync(storageDir)) {
    mkdirSync(storageDir, { recursive: true });
  }
  const ext = getExt(file.type);
  const fileName = `${type}.${ext}`;
  const filePath = join(storageDir, fileName);

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    writeFileSync(filePath, buf);
  } catch (err) {
    logError("verification.upload.write.error", err, { requestId, type });
    return NextResponse.json({ error: "Не удалось сохранить файл" }, { status: 500 });
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
}
