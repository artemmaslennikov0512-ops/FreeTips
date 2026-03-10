/**
 * POST /api/admin/verification-requests/[id]/reject — отклонить заявку с указанием причины.
 * Body: { reason: string } — причина, которую видит клиент.
 * Только SUPERADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { VerificationStatus } from "@prisma/client";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError } from "@/lib/api/helpers";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z.string().trim().min(1, "Укажите причину отказа").max(1000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;
  const adminId = auth.user.userId;
  const { id } = await params;

  const bodyResult = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!bodyResult.ok) return bodyResult.response;
  const parsed = rejectSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(400, "Укажите причину отказа", parsed.error.issues);
  }

  const verificationRequest = await db.verificationRequest.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });

  if (!verificationRequest) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }
  if (verificationRequest.status !== "PENDING") {
    return NextResponse.json({ error: "Заявка уже рассмотрена" }, { status: 400 });
  }

  const reason = parsed.data.reason;

  await db.$transaction([
    db.verificationRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedByUserId: adminId,
      },
    }),
    db.user.update({
      where: { id: verificationRequest.userId },
      data: {
        verificationStatus: VerificationStatus.REJECTED,
        verificationRejectionReason: reason,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
