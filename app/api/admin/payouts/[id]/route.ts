/**
 * PATCH /api/admin/payouts/[id]
 * Смена статуса заявки на вывод: PROCESSING | COMPLETED | REJECTED, опционально externalId.
 * Требует: Authorization: Bearer <access_token>, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";
import { broadcastBalanceUpdated } from "@/lib/ws-broadcast";
import { requestPaygineBalance } from "@/lib/payment/request-paygine-balance";

const updatePayoutSchema = z.object({
  status: z.enum(["PROCESSING", "COMPLETED", "REJECTED"]),
  externalId: z.string().max(255, "externalId слишком длинный").optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const { id } = await params;

  const bodyResult = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = updatePayoutSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Неверные данные", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { status, externalId } = parsed.data;

  const payout = await db.payoutRequest.findUnique({
    where: { id },
  });

  if (!payout) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  const updateData: {
    status: typeof status;
    externalId?: string;
    completedByUserId?: string | null;
  } = { status };
  if (externalId !== undefined) {
    updateData.externalId = externalId;
  }
  if (status === "COMPLETED") {
    updateData.completedByUserId = auth.user.userId;
  }

  const updated = await db.payoutRequest.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: { id: true, login: true, email: true },
      },
    },
  });

  if (status === "COMPLETED") {
    void broadcastBalanceUpdated(updated.userId);
  }
  void requestPaygineBalance(updated.userId);

  return NextResponse.json({
    id: updated.id,
    userId: updated.userId,
    userLogin: updated.user.login,
    userEmail: updated.user.email,
    amountKop: Number(updated.amountKop),
    status: updated.status,
    externalId: updated.externalId,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
