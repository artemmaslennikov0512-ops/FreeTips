/**
 * GET /api/establishment/join-requests — входящие заявки на подключение сотрудников.
 * Требует: ESTABLISHMENT_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { RegistrationRequestStatus } from "@prisma/client";

const statusLabel: Record<RegistrationRequestStatus, string> = {
  PENDING: "Ожидает решения",
  APPROVED: "Одобрено",
  REJECTED: "Отклонено",
};

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const status = request.nextUrl.searchParams.get("status")?.toUpperCase();
  const where: { establishmentId: string; status?: RegistrationRequestStatus } = {
    establishmentId: auth.establishmentId,
  };
  if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") {
    where.status = status as RegistrationRequestStatus;
  }

  const list = await db.employeeJoinRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      reviewedAt: true,
      user: {
        select: { login: true, fullName: true, email: true },
      },
    },
  });

  return NextResponse.json({
    requests: list.map((r) => ({
      id: r.id,
      status: r.status,
      statusHint: statusLabel[r.status],
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      userLogin: r.user.login,
      userFullName: r.user.fullName?.trim() || null,
      userEmail: r.user.email,
    })),
  });
}
