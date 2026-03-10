/**
 * GET /api/admin/verification-requests/[id] — одна заявка с данными пользователя.
 * PATCH не используем; approve/reject — отдельные POST.
 * Только SUPERADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;
  const { id } = await params;

  const req = await db.verificationRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          login: true,
          email: true,
          uniqueId: true,
          fullName: true,
          verificationStatus: true,
        },
      },
      documents: {
        select: { id: true, type: true, filePath: true, downloadedAt: true },
      },
    },
  });

  if (!req) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  return NextResponse.json({
    id: req.id,
    userId: req.userId,
    fullName: req.fullName,
    birthDate: req.birthDate,
    passportSeries: req.passportSeries,
    passportNumber: req.passportNumber,
    inn: req.inn,
    status: req.status,
    rejectionReason: req.rejectionReason,
    reviewedAt: req.reviewedAt?.toISOString() ?? null,
    createdAt: req.createdAt.toISOString(),
    user: req.user,
    documents: req.documents.map((d) => ({
      id: d.id,
      type: d.type,
      filePath: d.filePath,
      downloadedAt: d.downloadedAt?.toISOString() ?? null,
    })),
  });
}
