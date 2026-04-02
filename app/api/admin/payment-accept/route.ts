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
});

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

  const { globalPaymentsDisabled, whitelistText, blacklistText } = parsed.data;
  if (
    globalPaymentsDisabled === undefined &&
    whitelistText === undefined &&
    blacklistText === undefined
  ) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  const updatePayload: {
    globalPaymentsDisabled?: boolean;
    paymentWhitelistUserIds?: string[];
    paymentBlacklistUserIds?: string[];
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
    updatedAt: row.updatedAt.toISOString(),
    ...(whitelistUnknown !== undefined && whitelistUnknown.length > 0 ? { whitelistUnknownTokens: whitelistUnknown } : {}),
    ...(blacklistUnknown !== undefined && blacklistUnknown.length > 0 ? { blacklistUnknownTokens: blacklistUnknown } : {}),
  });
}
