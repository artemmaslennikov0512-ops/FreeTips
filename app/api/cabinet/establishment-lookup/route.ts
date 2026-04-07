/**
 * GET /api/cabinet/establishment-lookup?code= — поиск заведения по коду (uniqueSlug) для заявки на подключение.
 * Только RECIPIENT без профиля сотрудника.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import {
  normalizeEstablishmentCodeInput,
  validateEstablishmentCodeFormat,
  MSG_EST_CODE_NOT_FOUND,
} from "@/lib/establishment-code-input";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

  if (auth.user.role !== "RECIPIENT") {
    return NextResponse.json(
      { error: "Поиск заведения доступен только для личного аккаунта официанта" },
      { status: 403 },
    );
  }

  const existingEmployee = await db.employee.findUnique({
    where: { userId: auth.user.userId },
    select: { id: true },
  });
  if (existingEmployee) {
    return NextResponse.json(
      { error: "Вы уже привязаны к заведению как сотрудник" },
      { status: 403 },
    );
  }

  const raw = request.nextUrl.searchParams.get("code") ?? "";
  const normalized = normalizeEstablishmentCodeInput(raw);
  const formatCheck = validateEstablishmentCodeFormat(normalized);
  if (!formatCheck.ok) {
    return NextResponse.json({ error: formatCheck.message }, { status: 400 });
  }
  const code = formatCheck.code;

  const est = await db.establishment.findUnique({
    where: { uniqueSlug: code },
    select: { id: true, name: true, uniqueSlug: true },
  });

  if (!est) {
    return NextResponse.json({
      found: false as const,
      message: MSG_EST_CODE_NOT_FOUND,
    });
  }

  return NextResponse.json({
    found: true as const,
    establishment: {
      id: est.id,
      name: est.name,
      code: est.uniqueSlug,
    },
  });
}
