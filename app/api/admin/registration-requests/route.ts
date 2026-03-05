/**
 * GET /api/admin/registration-requests — список заявок на подключение.
 * Требует: Authorization, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const list = await db.registrationRequest.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      dateOfBirth: true,
      establishment: true,
      phone: true,
      activityType: true,
      email: true,
      status: true,
      createdAt: true,
      registrationTokenId: true,
      registrationToken: { select: { expiresAt: true } },
    },
  });

  const requests = list.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    dateOfBirth: r.dateOfBirth,
    establishment: r.establishment,
    phone: r.phone,
    activityType: r.activityType,
    email: r.email,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    hasToken: !!r.registrationTokenId,
    tokenExpiresAt: r.registrationToken?.expiresAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ requests });
}
