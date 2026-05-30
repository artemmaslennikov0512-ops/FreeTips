/**
 * POST /api/admin/users/verify-bulk
 * Массово подтверждает верификацию официантов по списку ID.
 * Поддерживает: `user.id`, `uniqueId`, login, код официанта `000-123`, `#123`, `ID: #123`.
 * Требует: Authorization: Bearer <access_token>, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { UserRole, VerificationStatus } from "@prisma/client";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";
import { normalizeBulkUserIdToken, toWaiterCodeSlug } from "@/lib/parse-bulk-user-id-tokens";
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
    .map(normalizeBulkUserIdToken)
    .filter(Boolean);
  const uniqTokens = Array.from(new Set(inputTokens));

  const uniqueIdCandidates = uniqTokens
    .filter((v) => /^\d+$/.test(v))
    .map((v) => Number.parseInt(v, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  const stringIdCandidates = uniqTokens.filter((v) => !/^\d+$/.test(v) && toWaiterCodeSlug(v) == null);

  const waiterCodeSlugs = Array.from(
    new Set(
      uniqTokens
        .map(toWaiterCodeSlug)
        .filter((s): s is string => s != null),
    ),
  );

  const directOrClause = [
    ...(uniqueIdCandidates.length > 0 ? [{ uniqueId: { in: uniqueIdCandidates } }] : []),
    ...(stringIdCandidates.length > 0
      ? [
          { id: { in: stringIdCandidates } },
          ...stringIdCandidates.map((login) => ({
            login: { equals: login, mode: "insensitive" as const },
          })),
        ]
      : []),
  ];

  const [usersDirect, tipLinks, employees] = await Promise.all([
    directOrClause.length > 0
      ? db.user.findMany({
          where: { OR: directOrClause },
          select: {
            id: true,
            uniqueId: true,
            login: true,
            role: true,
            verificationStatus: true,
          },
        })
      : Promise.resolve([]),
    waiterCodeSlugs.length > 0
      ? db.tipLink.findMany({
          where: { slug: { in: waiterCodeSlugs } },
          select: { slug: true, userId: true },
        })
      : Promise.resolve([]),
    waiterCodeSlugs.length > 0
      ? db.employee.findMany({
          where: { qrCodeIdentifier: { in: waiterCodeSlugs }, userId: { not: null } },
          select: { qrCodeIdentifier: true, userId: true },
        })
      : Promise.resolve([]),
  ]);

  const slugToUserId = new Map<string, string>();
  for (const tl of tipLinks) slugToUserId.set(tl.slug, tl.userId);
  for (const emp of employees) {
    if (emp.userId) slugToUserId.set(emp.qrCodeIdentifier, emp.userId);
  }

  const missingUserIds = Array.from(new Set(slugToUserId.values())).filter(
    (id) => !usersDirect.some((u) => u.id === id),
  );
  const usersFromSlugs =
    missingUserIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: missingUserIds } },
          select: {
            id: true,
            uniqueId: true,
            login: true,
            role: true,
            verificationStatus: true,
          },
        })
      : [];

  const users = [...usersDirect, ...usersFromSlugs];

  const byStringId = new Map<string, ResolveCandidate>();
  const byUniqueId = new Map<number, ResolveCandidate>();
  const byLogin = new Map<string, ResolveCandidate>();
  const byWaiterCode = new Map<string, ResolveCandidate>();
  for (const u of users) {
    byStringId.set(u.id, u);
    byUniqueId.set(u.uniqueId, u);
    byLogin.set(u.login.toLowerCase(), u);
  }
  for (const [slug, userId] of slugToUserId) {
    const user = byStringId.get(userId);
    if (user) byWaiterCode.set(slug, user);
  }

  const notFound: string[] = [];
  const notAllowed: string[] = [];
  const alreadyVerified: string[] = [];
  const toVerifyIds: string[] = [];
  const verified: string[] = [];

  for (const token of uniqTokens) {
    const asNumber = /^\d+$/.test(token) ? Number.parseInt(token, 10) : null;
    const waiterSlug = toWaiterCodeSlug(token);
    const resolved =
      byStringId.get(token) ??
      (asNumber != null ? byUniqueId.get(asNumber) : undefined) ??
      byLogin.get(token.toLowerCase()) ??
      (waiterSlug != null ? byWaiterCode.get(waiterSlug) : undefined);

    if (!resolved) {
      notFound.push(token);
      continue;
    }
    if (resolved.role === UserRole.SUPERADMIN) {
      notAllowed.push(token);
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
    notEmployee: notAllowed.length,
    notFound: notFound.length,
  });

  return NextResponse.json({
    ok: true,
    processed: uniqTokens.length,
    verifiedCount: uniqueToVerifyIds.length,
    alreadyVerifiedCount: alreadyVerified.length,
    notEmployeeCount: notAllowed.length,
    notFoundCount: notFound.length,
    verified,
    alreadyVerified,
    notEmployee: notAllowed,
    notFound,
  });
}
