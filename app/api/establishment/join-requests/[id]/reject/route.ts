/**
 * POST /api/establishment/join-requests/[id]/reject — отклонить заявку (опционально причина).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { RegistrationRequestStatus } from "@prisma/client";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError } from "@/lib/api/helpers";

const bodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  if (!verifyCsrfFromRequest(request)) {
    return NextResponse.json({ error: "Некорректный CSRF токен" }, { status: 403 });
  }

  const { id: requestId } = await params;

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsed.ok) return parsed.response;
  const body = bodySchema.safeParse(parsed.data);
  if (!body.success) {
    return jsonError(400, body.error.issues[0]?.message ?? "Неверные данные");
  }

  const updated = await db.employeeJoinRequest.updateMany({
    where: {
      id: requestId,
      establishmentId: auth.establishmentId,
      status: RegistrationRequestStatus.PENDING,
    },
    data: {
      status: RegistrationRequestStatus.REJECTED,
      reviewedAt: new Date(),
      reviewedByUserId: auth.user.userId,
      rejectionReason: body.data.reason?.trim() || null,
    },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Заявка не найдена или уже обработана" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
