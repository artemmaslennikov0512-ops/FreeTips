import { db } from "@/lib/db";
import type { PaymentAcceptSettings } from "@/lib/payment-accept-policy";

const MAIN_ID = "main";

function rowToAcceptSettings(row: {
  globalPaymentsDisabled: boolean;
  paymentWhitelistUserIds: string[];
  paymentBlacklistUserIds: string[];
}): PaymentAcceptSettings {
  return {
    globalPaymentsDisabled: row.globalPaymentsDisabled,
    paymentWhitelistUserIds: row.paymentWhitelistUserIds,
    paymentBlacklistUserIds: row.paymentBlacklistUserIds,
  };
}

export async function getPlatformPaymentSettings(): Promise<PaymentAcceptSettings> {
  const row = await getPlatformPaymentSettingsRow();
  return rowToAcceptSettings(row);
}

type PlatformPaymentSettingsRow = {
  globalPaymentsDisabled: boolean;
  paymentWhitelistUserIds: string[];
  paymentBlacklistUserIds: string[];
  recipientMaxIncomingKopPerMskDay: bigint | null;
  recipientMaxConcurrentPendingPayments: number | null;
  recipientMinMinutesBetweenPayInits: number | null;
  recipientMaxPayInitsPerDay: number | null;
  updatedAt: Date;
};

export async function getPlatformPaymentSettingsRow(): Promise<PlatformPaymentSettingsRow> {
  const row = await db.platformPaymentSettings.findUnique({ where: { id: MAIN_ID } });
  if (!row) {
    const created = await db.platformPaymentSettings.create({ data: { id: MAIN_ID } });
    return {
      globalPaymentsDisabled: created.globalPaymentsDisabled,
      paymentWhitelistUserIds: created.paymentWhitelistUserIds,
      paymentBlacklistUserIds: created.paymentBlacklistUserIds,
      recipientMaxIncomingKopPerMskDay: created.recipientMaxIncomingKopPerMskDay,
      recipientMaxConcurrentPendingPayments: created.recipientMaxConcurrentPendingPayments,
      recipientMinMinutesBetweenPayInits: created.recipientMinMinutesBetweenPayInits,
      recipientMaxPayInitsPerDay: created.recipientMaxPayInitsPerDay,
      updatedAt: created.updatedAt,
    };
  }
  return {
    globalPaymentsDisabled: row.globalPaymentsDisabled,
    paymentWhitelistUserIds: row.paymentWhitelistUserIds,
    paymentBlacklistUserIds: row.paymentBlacklistUserIds,
    recipientMaxIncomingKopPerMskDay: row.recipientMaxIncomingKopPerMskDay,
    recipientMaxConcurrentPendingPayments: row.recipientMaxConcurrentPendingPayments,
    recipientMinMinutesBetweenPayInits: row.recipientMinMinutesBetweenPayInits,
    recipientMaxPayInitsPerDay: row.recipientMaxPayInitsPerDay,
    updatedAt: row.updatedAt,
  };
}

export async function updatePlatformPaymentSettings(data: {
  globalPaymentsDisabled?: boolean;
  paymentWhitelistUserIds?: string[];
  paymentBlacklistUserIds?: string[];
  recipientMaxIncomingKopPerMskDay?: bigint | null;
  recipientMaxConcurrentPendingPayments?: number | null;
  recipientMinMinutesBetweenPayInits?: number | null;
  recipientMaxPayInitsPerDay?: number | null;
}): Promise<PlatformPaymentSettingsRow> {
  await db.platformPaymentSettings.upsert({
    where: { id: MAIN_ID },
    create: {
      id: MAIN_ID,
      globalPaymentsDisabled: data.globalPaymentsDisabled ?? false,
      paymentWhitelistUserIds: data.paymentWhitelistUserIds ?? [],
      paymentBlacklistUserIds: data.paymentBlacklistUserIds ?? [],
      recipientMaxIncomingKopPerMskDay: data.recipientMaxIncomingKopPerMskDay ?? null,
      recipientMaxConcurrentPendingPayments: data.recipientMaxConcurrentPendingPayments ?? null,
      recipientMinMinutesBetweenPayInits: data.recipientMinMinutesBetweenPayInits ?? null,
      recipientMaxPayInitsPerDay: data.recipientMaxPayInitsPerDay ?? null,
    },
    update: {
      ...(data.globalPaymentsDisabled !== undefined ? { globalPaymentsDisabled: data.globalPaymentsDisabled } : {}),
      ...(data.paymentWhitelistUserIds !== undefined ? { paymentWhitelistUserIds: data.paymentWhitelistUserIds } : {}),
      ...(data.paymentBlacklistUserIds !== undefined ? { paymentBlacklistUserIds: data.paymentBlacklistUserIds } : {}),
      ...(data.recipientMaxIncomingKopPerMskDay !== undefined ? { recipientMaxIncomingKopPerMskDay: data.recipientMaxIncomingKopPerMskDay } : {}),
      ...(data.recipientMaxConcurrentPendingPayments !== undefined
        ? { recipientMaxConcurrentPendingPayments: data.recipientMaxConcurrentPendingPayments }
        : {}),
      ...(data.recipientMinMinutesBetweenPayInits !== undefined
        ? { recipientMinMinutesBetweenPayInits: data.recipientMinMinutesBetweenPayInits }
        : {}),
      ...(data.recipientMaxPayInitsPerDay !== undefined
        ? { recipientMaxPayInitsPerDay: data.recipientMaxPayInitsPerDay }
        : {}),
    },
  });
  return getPlatformPaymentSettingsRow();
}
