/**
 * GET /api/admin/requests-counts — количество заявок по статусам (верификация + подключение).
 * SUPERADMIN. Для бейджей и уведомлений.
 */

import { NextRequest, NextResponse } from "next/server";
import { RegistrationRequestStatus } from "@prisma/client";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";

export type AdminRequestsCountsPayload = {
  verification: { pending: number; approved: number; rejected: number };
  connection: { pending: number; approved: number; rejected: number };
  /** Сумма pending по обоим типам — «новые на рассмотрении». */
  totalPending: number;
};

export async function GET(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const [vPending, vApproved, vRejected, cPending, cApproved, cRejected] = await Promise.all([
    db.verificationRequest.count({ where: { status: RegistrationRequestStatus.PENDING } }),
    db.verificationRequest.count({ where: { status: RegistrationRequestStatus.APPROVED } }),
    db.verificationRequest.count({ where: { status: RegistrationRequestStatus.REJECTED } }),
    db.registrationRequest.count({ where: { status: RegistrationRequestStatus.PENDING } }),
    db.registrationRequest.count({ where: { status: RegistrationRequestStatus.APPROVED } }),
    db.registrationRequest.count({ where: { status: RegistrationRequestStatus.REJECTED } }),
  ]);

  const payload: AdminRequestsCountsPayload = {
    verification: { pending: vPending, approved: vApproved, rejected: vRejected },
    connection: { pending: cPending, approved: cApproved, rejected: cRejected },
    totalPending: vPending + cPending,
  };

  return NextResponse.json(payload);
}
