/**
 * POST /api/cabinet/employee-leave-requests/cancel — отозвать ожидающую заявку на выход.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { RegistrationRequestStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

  if (!verifyCsrfFromRequest(request)) {
    return NextResponse.json({ error: "Некорректный CSRF токен" }, { status: 403 });
  }

  const deleted = await db.employeeLeaveRequest.deleteMany({
    where: {
      userId: auth.user.userId,
      status: RegistrationRequestStatus.PENDING,
    },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Нет заявки для отмены" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
