/**
 * GET /api/admin/verification-requests — список заявок на верификацию.
 * Query: status=PENDING | APPROVED | REJECTED (по умолчанию PENDING).
 * Только SUPERADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { RegistrationRequestStatus } from "@prisma/client";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";

function parseStatus(searchParams: URLSearchParams): RegistrationRequestStatus {
  const raw = searchParams.get("status")?.toUpperCase();
  if (raw === "APPROVED" || raw === "REJECTED" || raw === "PENDING") {
    return raw;
  }
  return RegistrationRequestStatus.PENDING;
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const status = parseStatus(request.nextUrl.searchParams);
  const orderBy =
    status === RegistrationRequestStatus.PENDING
      ? { createdAt: "asc" as const }
      : [{ reviewedAt: "desc" as const }, { createdAt: "desc" as const }];

  const list = await db.verificationRequest.findMany({
    where: { status },
    orderBy,
    select: {
      id: true,
      userId: true,
      fullName: true,
      birthDate: true,
      passportSeries: true,
      passportNumber: true,
      inn: true,
      status: true,
      rejectionReason: true,
      reviewedAt: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          login: true,
          email: true,
          uniqueId: true,
        },
      },
      documents: {
        select: { type: true, id: true },
      },
    },
  });

  const items = list.map((r) => ({
    id: r.id,
    userId: r.userId,
    fullName: r.fullName,
    birthDate: r.birthDate,
    passportSeries: r.passportSeries,
    passportNumber: r.passportNumber,
    inn: r.inn,
    status: r.status,
    rejectionReason: r.rejectionReason,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    login: r.user.login,
    email: r.user.email,
    uniqueId: r.user.uniqueId,
    hasPassportSpread: r.documents.some((d) => d.type === "passport_spread"),
    hasSelfie: r.documents.some((d) => d.type === "selfie"),
  }));

  return NextResponse.json({ requests: items });
}
