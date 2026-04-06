/**
 * POST /api/admin/registration-requests/[id]/reject — отклонить заявку на подключение.
 * Body: { reason: string }
 * Только SUPERADMIN. Статус только PENDING (без выданного токена).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError } from "@/lib/api/helpers";
import { z } from "zod";
import { logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";

const rejectSchema = z.object({
  reason: z.string().trim().min(1, "Укажите причину отказа").max(1000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const requestId = getRequestId(request);
  const { id } = await params;

  const bodyResult = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!bodyResult.ok) return bodyResult.response;
  const parsed = rejectSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(400, "Укажите причину отказа", parsed.error.issues);
  }

  const row = await db.registrationRequest.findUnique({
    where: { id },
    select: { id: true, status: true, registrationTokenId: true, email: true },
  });

  if (!row) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }
  if (row.status !== "PENDING") {
    return NextResponse.json({ error: "Заявка уже рассмотрена" }, { status: 400 });
  }
  if (row.registrationTokenId) {
    return NextResponse.json(
      { error: "По заявке уже выдана ссылка. Отклонение недоступно." },
      { status: 400 },
    );
  }

  const reason = parsed.data.reason;

  await db.registrationRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectionReason: reason,
      reviewedAt: new Date(),
      reviewedByUserId: auth.user.userId,
    },
  });

  logSecurity("admin.registration_request.rejected", {
    requestId,
    registrationRequestId: id,
    adminId: auth.user.userId,
    applicantEmail: row.email,
  });

  return NextResponse.json({ ok: true });
}
