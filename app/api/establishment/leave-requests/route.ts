/**
 * GET /api/establishment/leave-requests — входящие заявки на выход (ESTABLISHMENT_ADMIN).
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

  const statusParam = request.nextUrl.searchParams.get("status")?.toUpperCase();
  const statusFilter =
    statusParam === "PENDING" || statusParam === "APPROVED" || statusParam === "REJECTED"
      ? (statusParam as RegistrationRequestStatus)
      : undefined;

  const list = await db.employeeLeaveRequest.findMany({
    where: {
      establishmentId: auth.establishmentId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
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
      userFullName: r.user.fullName,
      userEmail: r.user.email,
    })),
  });
}
