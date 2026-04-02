/**
 * GET/PUT порогов наблюдения антифрода (без блокировок). SUPERADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import {
  FRAUD_OBSERVE_DEFAULTS,
  getFraudObserveSettings,
  saveFraudObserveSettings,
} from "@/lib/fraud-observe-settings";
import { jsonError } from "@/lib/api/helpers";

const windowMinSchema = z.number().int().min(1).max(10_080).nullable();
const countSchema = z.number().int().min(2).max(50_000).nullable();

const putSchema = z.object({
  observePayoutWindowMinutes: windowMinSchema.optional(),
  observePayoutMinCount: countSchema.optional(),
  observePayInitWindowMinutes: windowMinSchema.optional(),
  observePayInitMinCount: countSchema.optional(),
  observePaySuccessIpWindowMinutes: windowMinSchema.optional(),
  observePaySuccessIpMinCount: countSchema.optional(),
  observeSharedIpMinAccounts: countSchema.optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const [effective, row] = await Promise.all([
    getFraudObserveSettings(),
    db.systemDefaultLimits.findUnique({
      where: { id: "default" },
      select: {
        observePayoutWindowMinutes: true,
        observePayoutMinCount: true,
        observePayInitWindowMinutes: true,
        observePayInitMinCount: true,
        observePaySuccessIpWindowMinutes: true,
        observePaySuccessIpMinCount: true,
        observeSharedIpMinAccounts: true,
      },
    }),
  ]);

  return NextResponse.json({
    effective,
    database: row ?? null,
    builtInDefaults: FRAUD_OBSERVE_DEFAULTS,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Некорректный JSON");
  }

  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Некорректные данные", parsed.error.issues);
  }

  await saveFraudObserveSettings(parsed.data);
  const effective = await getFraudObserveSettings();
  return NextResponse.json({ ok: true, effective });
}
