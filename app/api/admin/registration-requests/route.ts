/**
 * GET /api/admin/registration-requests — список заявок на подключение.
 * Query: status=PENDING | APPROVED | REJECTED — фильтр; без параметра — все статусы (как раньше).
 * Требует: Authorization, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { RegistrationRequestStatus } from "@prisma/client";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const raw = request.nextUrl.searchParams.get("status")?.toUpperCase();
  const statusFilter =
    raw === "PENDING" || raw === "APPROVED" || raw === "REJECTED" ? (raw as RegistrationRequestStatus) : null;

  const list = await db.registrationRequest.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      requestType: true,
      fullName: true,
      dateOfBirth: true,
      establishment: true,
      phone: true,
      activityType: true,
      email: true,
      status: true,
      createdAt: true,
      registrationTokenId: true,
      companyName: true,
      companyRole: true,
      employeeCount: true,
      adminFullName: true,
      adminContactPhone: true,
      registrationToken: { select: { expiresAt: true } },
    },
  });

  const requests = list.map((r) => ({
    id: r.id,
    requestType: r.requestType ?? "individual",
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
    companyName: r.companyName,
    companyRole: r.companyRole,
    employeeCount: r.employeeCount,
    adminFullName: r.adminFullName,
    adminContactPhone: r.adminContactPhone,
  }));

  return NextResponse.json({ requests });
}
