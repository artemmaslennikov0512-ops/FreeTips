/**
 * Пороги наблюдения (сигналы антифрода без блокировок).
 * Хранятся в system_default_limits; null в БД → дефолты ниже.
 */

import { db } from "@/lib/db";

const ROW_ID = "default";
const CACHE_MS = 60_000;

type Cache = { at: number; row: Awaited<ReturnType<typeof fetchRow>> };

let cache: Cache | null = null;

async function fetchRow() {
  return db.systemDefaultLimits.findUnique({
    where: { id: ROW_ID },
    select: {
      observePayoutWindowMinutes: true,
      observePayoutMinCount: true,
      observePayInitWindowMinutes: true,
      observePayInitMinCount: true,
      observePaySuccessIpWindowMinutes: true,
      observePaySuccessIpMinCount: true,
      observeSharedIpMinAccounts: true,
    },
  });
}

/** Встроенные дефолты, если в БД null */
export const FRAUD_OBSERVE_DEFAULTS = {
  payoutWindowMinutes: 60,
  payoutMinCount: 4,
  payInitWindowMinutes: 10,
  payInitMinCount: 12,
  paySuccessIpWindowMinutes: 20,
  paySuccessIpMinCount: 6,
  sharedIpMinAccounts: 3,
} as const;

type ResolvedFraudObserveSettings = {
  payoutWindowMinutes: number;
  payoutMinCount: number;
  payInitWindowMinutes: number;
  payInitMinCount: number;
  paySuccessIpWindowMinutes: number;
  paySuccessIpMinCount: number;
  sharedIpMinAccounts: number;
};

export async function getFraudObserveSettings(): Promise<ResolvedFraudObserveSettings> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) {
    return mergeRow(cache.row);
  }
  const row = await fetchRow();
  cache = { at: now, row };
  return mergeRow(row);
}

function mergeRow(row: Awaited<ReturnType<typeof fetchRow>>): ResolvedFraudObserveSettings {
  const d = FRAUD_OBSERVE_DEFAULTS;
  return {
    payoutWindowMinutes: row?.observePayoutWindowMinutes ?? d.payoutWindowMinutes,
    payoutMinCount: row?.observePayoutMinCount ?? d.payoutMinCount,
    payInitWindowMinutes: row?.observePayInitWindowMinutes ?? d.payInitWindowMinutes,
    payInitMinCount: row?.observePayInitMinCount ?? d.payInitMinCount,
    paySuccessIpWindowMinutes: row?.observePaySuccessIpWindowMinutes ?? d.paySuccessIpWindowMinutes,
    paySuccessIpMinCount: row?.observePaySuccessIpMinCount ?? d.paySuccessIpMinCount,
    sharedIpMinAccounts: row?.observeSharedIpMinAccounts ?? d.sharedIpMinAccounts,
  };
}

/** Сброс кэша после сохранения из админки */
function invalidateFraudObserveSettingsCache(): void {
  cache = null;
}

type FraudObserveSettingsPatch = Partial<{
  observePayoutWindowMinutes: number | null;
  observePayoutMinCount: number | null;
  observePayInitWindowMinutes: number | null;
  observePayInitMinCount: number | null;
  observePaySuccessIpWindowMinutes: number | null;
  observePaySuccessIpMinCount: number | null;
  observeSharedIpMinAccounts: number | null;
}>;

export async function saveFraudObserveSettings(patch: FraudObserveSettingsPatch): Promise<void> {
  const data: Record<string, number | null> = {};
  if (patch.observePayoutWindowMinutes !== undefined) data.observePayoutWindowMinutes = patch.observePayoutWindowMinutes;
  if (patch.observePayoutMinCount !== undefined) data.observePayoutMinCount = patch.observePayoutMinCount;
  if (patch.observePayInitWindowMinutes !== undefined) data.observePayInitWindowMinutes = patch.observePayInitWindowMinutes;
  if (patch.observePayInitMinCount !== undefined) data.observePayInitMinCount = patch.observePayInitMinCount;
  if (patch.observePaySuccessIpWindowMinutes !== undefined)
    data.observePaySuccessIpWindowMinutes = patch.observePaySuccessIpWindowMinutes;
  if (patch.observePaySuccessIpMinCount !== undefined) data.observePaySuccessIpMinCount = patch.observePaySuccessIpMinCount;
  if (patch.observeSharedIpMinAccounts !== undefined) data.observeSharedIpMinAccounts = patch.observeSharedIpMinAccounts;

  if (Object.keys(data).length === 0) return;

  await db.systemDefaultLimits.upsert({
    where: { id: ROW_ID },
    create: { id: ROW_ID, ...data },
    update: data,
  });
  invalidateFraudObserveSettingsCache();
}
