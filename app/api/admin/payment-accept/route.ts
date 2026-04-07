/**
 * GET/PATCH /api/admin/payment-accept — глобальный стоп приёма по ссылкам и белый/чёрный списки аккаунтов.
 * Требует: Authorization: Bearer <access_token>, роль SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { z } from "zod";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  getPlatformPaymentSettingsRow,
  updatePlatformPaymentSettings,
} from "@/lib/platform-payment-settings";
import { parsePaymentAccountTokens, resolvePaymentAccountTokensToUserIds } from "@/lib/resolve-payment-account-tokens";

async function userIdsToLines(ids: string[]): Promise<string> {
  if (ids.length === 0) return "";
  const users = await db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, login: true },
  });
  const byId = new Map(users.map((u) => [u.id, u.login]));
  return ids.map((id) => byId.get(id) ?? id).join("\n");
}

const patchSchema = z.object({
  globalPaymentsDisabled: z.boolean().optional(),
  whitelistText: z.string().nullable().optional(),
  blacklistText: z.string().nullable().optional(),
  /** null — снять лимит; не передавать поле — не менять. */
  recipientMaxDailyIncomingRubles: z.union([z.number().finite().min(0).max(999_999_999), z.null()]).optional(),
  recipientMaxConcurrentPendingPayments: z.union([z.number().int().min(1).max(100), z.null()]).optional(),
  recipientMinMinutesBetweenPayInits: z.union([z.number().int().min(1).max(10080), z.null()]).optional(),
  recipientMaxPayInitsPerDay: z.union([z.number().int().min(1).max(50_000), z.null()]).optional(),
});

function rublesToBalanceKop(rub: number): bigint {
  return BigInt(Math.round(rub * 100));
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const row = await getPlatformPaymentSettingsRow();
  const [whitelistLines, blacklistLines] = await Promise.all([
    userIdsToLines(row.paymentWhitelistUserIds),
    userIdsToLines(row.paymentBlacklistUserIds),
  ]);
  return NextResponse.json({
    globalPaymentsDisabled: row.globalPaymentsDisabled,
    paymentWhitelistUserIds: row.paymentWhitelistUserIds,
    paymentBlacklistUserIds: row.paymentBlacklistUserIds,
    whitelistText: whitelistLines,
    blacklistText: blacklistLines,
    recipientMaxDailyIncomingRubles:
      row.recipientMaxIncomingKopPerMskDay == null ? null : Number(row.recipientMaxIncomingKopPerMskDay) / 100,
    recipientMaxConcurrentPendingPayments: row.recipientMaxConcurrentPendingPayments,
    recipientMinMinutesBetweenPayInits: row.recipientMinMinutesBetweenPayInits,
    recipientMaxPayInitsPerDay: row.recipientMaxPayInitsPerDay,
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const bodyResult = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = patchSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные", issues: parsed.error.issues }, { status: 400 });
  }

  const {
    globalPaymentsDisabled,
    whitelistText,
    blacklistText,
    recipientMaxDailyIncomingRubles,
    recipientMaxConcurrentPendingPayments,
    recipientMinMinutesBetweenPayInits,
    recipientMaxPayInitsPerDay,
  } = parsed.data;
  if (
    globalPaymentsDisabled === undefined &&
    whitelistText === undefined &&
    blacklistText === undefined &&
    recipientMaxDailyIncomingRubles === undefined &&
    recipientMaxConcurrentPendingPayments === undefined &&
    recipientMinMinutesBetweenPayInits === undefined &&
    recipientMaxPayInitsPerDay === undefined
  ) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  const updatePayload: {
    globalPaymentsDisabled?: boolean;
    paymentWhitelistUserIds?: string[];
    paymentBlacklistUserIds?: string[];
    recipientMaxIncomingKopPerMskDay?: bigint | null;
    recipientMaxConcurrentPendingPayments?: number | null;
    recipientMinMinutesBetweenPayInits?: number | null;
    recipientMaxPayInitsPerDay?: number | null;
  } = {};

  if (globalPaymentsDisabled !== undefined) {
    updatePayload.globalPaymentsDisabled = globalPaymentsDisabled;
  }

  let whitelistUnknown: string[] | undefined;
  let blacklistUnknown: string[] | undefined;

  if (whitelistText !== undefined) {
    const tokens = whitelistText === null || whitelistText === "" ? [] : parsePaymentAccountTokens(whitelistText);
    const resolved = await resolvePaymentAccountTokensToUserIds(tokens);
    updatePayload.paymentWhitelistUserIds = resolved.ids;
    whitelistUnknown = resolved.unknownTokens;
  }

  if (blacklistText !== undefined) {
    const tokens = blacklistText === null || blacklistText === "" ? [] : parsePaymentAccountTokens(blacklistText);
    const resolved = await resolvePaymentAccountTokensToUserIds(tokens);
    updatePayload.paymentBlacklistUserIds = resolved.ids;
    blacklistUnknown = resolved.unknownTokens;
  }

  if (recipientMaxDailyIncomingRubles !== undefined) {
    updatePayload.recipientMaxIncomingKopPerMskDay =
      recipientMaxDailyIncomingRubles == null ? null : rublesToBalanceKop(recipientMaxDailyIncomingRubles);
  }
  if (recipientMaxConcurrentPendingPayments !== undefined) {
    updatePayload.recipientMaxConcurrentPendingPayments = recipientMaxConcurrentPendingPayments;
  }
  if (recipientMinMinutesBetweenPayInits !== undefined) {
    updatePayload.recipientMinMinutesBetweenPayInits = recipientMinMinutesBetweenPayInits;
  }
  if (recipientMaxPayInitsPerDay !== undefined) {
    updatePayload.recipientMaxPayInitsPerDay = recipientMaxPayInitsPerDay;
  }

  const row = await updatePlatformPaymentSettings(updatePayload);

  const [whitelistLines, blacklistLines] = await Promise.all([
    userIdsToLines(row.paymentWhitelistUserIds),
    userIdsToLines(row.paymentBlacklistUserIds),
  ]);

  return NextResponse.json({
    globalPaymentsDisabled: row.globalPaymentsDisabled,
    paymentWhitelistUserIds: row.paymentWhitelistUserIds,
    paymentBlacklistUserIds: row.paymentBlacklistUserIds,
    whitelistText: whitelistLines,
    blacklistText: blacklistLines,
    recipientMaxDailyIncomingRubles:
      row.recipientMaxIncomingKopPerMskDay == null ? null : Number(row.recipientMaxIncomingKopPerMskDay) / 100,
    recipientMaxConcurrentPendingPayments: row.recipientMaxConcurrentPendingPayments,
    recipientMinMinutesBetweenPayInits: row.recipientMinMinutesBetweenPayInits,
    recipientMaxPayInitsPerDay: row.recipientMaxPayInitsPerDay,
    updatedAt: row.updatedAt.toISOString(),
    ...(whitelistUnknown !== undefined && whitelistUnknown.length > 0 ? { whitelistUnknownTokens: whitelistUnknown } : {}),
    ...(blacklistUnknown !== undefined && blacklistUnknown.length > 0 ? { blacklistUnknownTokens: blacklistUnknown } : {}),
  });
}
