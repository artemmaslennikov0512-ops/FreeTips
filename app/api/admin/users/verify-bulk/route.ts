/**
 * POST /api/admin/users/verify-bulk
 * Массово подтверждает верификацию официантов по списку ID.
 * Поддерживает два формата идентификатора: `user.id` и числовой `uniqueId`.
 * Требует: Authorization: Bearer <access_token>, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { UserRole, VerificationStatus } from "@prisma/client";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";
import { z } from "zod";
import { logSecurity } from "@/lib/logger";

const bodySchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1).max(1000),
});

type ResolveCandidate = {
  id: string;
  uniqueId: number;
  role: UserRole;
  verificationStatus: VerificationStatus;
};

export async function POST(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const bodyResult = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = bodySchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Неверные данные", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const inputTokens = parsed.data.ids
    .map((v) => v.trim())
    .filter(Boolean);
  const uniqTokens = Array.from(new Set(inputTokens));

  const uniqueIdCandidates = uniqTokens
    .filter((v) => /^\d+$/.test(v))
    .map((v) => Number.parseInt(v, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  const stringIdCandidates = uniqTokens.filter((v) => !/^\d+$/.test(v));

  const users = await db.user.findMany({
    where: {
      OR: [
        ...(uniqueIdCandidates.length > 0 ? [{ uniqueId: { in: uniqueIdCandidates } }] : []),
        ...(stringIdCandidates.length > 0 ? [{ id: { in: stringIdCandidates } }] : []),
      ],
    },
    select: {
      id: true,
      uniqueId: true,
      role: true,
      verificationStatus: true,
    },
  });

  const byStringId = new Map<string, ResolveCandidate>();
  const byUniqueId = new Map<number, ResolveCandidate>();
  for (const u of users) {
    byStringId.set(u.id, u);
    byUniqueId.set(u.uniqueId, u);
  }

  const notFound: string[] = [];
  const notEmployee: string[] = [];
  const alreadyVerified: string[] = [];
  const toVerifyIds: string[] = [];
  const verified: string[] = [];

  for (const token of uniqTokens) {
    const asNumber = /^\d+$/.test(token) ? Number.parseInt(token, 10) : null;
    const resolved =
      byStringId.get(token) ??
      (asNumber != null ? byUniqueId.get(asNumber) : undefined);

    if (!resolved) {
      notFound.push(token);
      continue;
    }
    if (resolved.role !== UserRole.EMPLOYEE) {
      notEmployee.push(token);
      continue;
    }
    if (resolved.verificationStatus === VerificationStatus.VERIFIED) {
      alreadyVerified.push(token);
      continue;
    }
    toVerifyIds.push(resolved.id);
    verified.push(token);
  }

  const uniqueToVerifyIds = Array.from(new Set(toVerifyIds));
  if (uniqueToVerifyIds.length > 0) {
    await db.user.updateMany({
      where: { id: { in: uniqueToVerifyIds } },
      data: {
        verificationStatus: VerificationStatus.VERIFIED,
        verificationRejectionReason: null,
      },
    });
  }

  const requestId = request.headers.get("x-request-id") ?? undefined;
  logSecurity("admin.user.bulk_verify", {
    requestId,
    adminId: auth.user.userId,
    processed: uniqTokens.length,
    verified: uniqueToVerifyIds.length,
    alreadyVerified: alreadyVerified.length,
    notEmployee: notEmployee.length,
    notFound: notFound.length,
  });

  return NextResponse.json({
    ok: true,
    processed: uniqTokens.length,
    verifiedCount: uniqueToVerifyIds.length,
    alreadyVerifiedCount: alreadyVerified.length,
    notEmployeeCount: notEmployee.length,
    notFoundCount: notFound.length,
    verified,
    alreadyVerified,
    notEmployee,
    notFound,
  });
}
