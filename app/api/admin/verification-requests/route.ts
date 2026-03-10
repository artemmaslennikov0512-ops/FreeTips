/**
 * GET /api/admin/verification-requests — список заявок на верификацию (PENDING).
 * Только SUPERADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const list = await db.verificationRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      fullName: true,
      birthDate: true,
      passportSeries: true,
      passportNumber: true,
      inn: true,
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
    createdAt: r.createdAt.toISOString(),
    login: r.user.login,
    email: r.user.email,
    uniqueId: r.user.uniqueId,
    hasPassportMain: r.documents.some((d) => d.type === "passport_main"),
    hasPassportSpread: r.documents.some((d) => d.type === "passport_spread"),
    hasSelfie: r.documents.some((d) => d.type === "selfie"),
  }));

  return NextResponse.json({ requests: items });
}
