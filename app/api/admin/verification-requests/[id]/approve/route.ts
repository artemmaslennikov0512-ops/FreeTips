/**
 * POST /api/admin/verification-requests/[id]/approve — подтвердить верификацию.
 * Только SUPERADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { VerificationStatus } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;
  const adminId = auth.user.userId;
  const { id } = await params;

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

  await db.$transaction([
    db.verificationRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedByUserId: adminId,
        rejectionReason: null,
      },
    }),
    db.user.update({
      where: { id: verificationRequest.userId },
      data: {
        verificationStatus: VerificationStatus.VERIFIED,
        verificationRejectionReason: null,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
