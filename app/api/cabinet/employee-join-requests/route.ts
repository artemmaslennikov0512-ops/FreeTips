/**
 * GET /api/cabinet/employee-join-requests — мои заявки на подключение к заведениям.
 * POST — отправить заявку { establishmentId }.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError } from "@/lib/api/helpers";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { RegistrationRequestStatus } from "@prisma/client";
import { MSG_ESTABLISHMENT_STALE_OR_MISSING } from "@/lib/establishment-code-input";

const postSchema = z.object({
  establishmentId: z.string().trim().min(1, "Укажите заведение"),
});

const statusLabel: Record<RegistrationRequestStatus, string> = {
  PENDING: "Ожидается подтверждение администратора",
  APPROVED: "Одобрено",
  REJECTED: "Отклонено",
};

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

  const list = await db.employeeJoinRequest.findMany({
    where: { userId: auth.user.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      establishment: { select: { name: true, uniqueSlug: true } },
    },
  });

  return NextResponse.json({
    requests: list.map((r) => ({
      id: r.id,
      status: r.status,
      statusHint: statusLabel[r.status],
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt.toISOString(),
      establishmentName: r.establishment.name,
      establishmentCode: r.establishment.uniqueSlug,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

  if (!verifyCsrfFromRequest(request)) {
    return NextResponse.json({ error: "Некорректный CSRF токен" }, { status: 403 });
  }

  if (auth.user.role !== "RECIPIENT") {
    return NextResponse.json(
      { error: "Заявку может отправить только аккаунт без привязки к заведению" },
      { status: 403 },
    );
  }

  const existingEmployee = await db.employee.findUnique({
    where: { userId: auth.user.userId },
    select: { id: true },
  });
  if (existingEmployee) {
    return NextResponse.json({ error: "Вы уже сотрудник заведения" }, { status: 403 });
  }

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsed.ok) return parsed.response;

  const body = postSchema.safeParse(parsed.data);
  if (!body.success) {
    return jsonError(400, body.error.issues[0]?.message ?? "Неверные данные");
  }

  const { establishmentId } = body.data;

  const establishment = await db.establishment.findUnique({
    where: { id: establishmentId },
    select: { id: true },
  });
  if (!establishment) {
    return NextResponse.json({ error: MSG_ESTABLISHMENT_STALE_OR_MISSING }, { status: 404 });
  }

  const duplicate = await db.employeeJoinRequest.findFirst({
    where: {
      userId: auth.user.userId,
      establishmentId,
      status: RegistrationRequestStatus.PENDING,
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Заявка в это заведение уже отправлена" }, { status: 409 });
  }

  const row = await db.employeeJoinRequest.create({
    data: {
      establishmentId,
      userId: auth.user.userId,
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json(
    {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      statusHint: statusLabel.PENDING,
    },
    { status: 201 },
  );
}
