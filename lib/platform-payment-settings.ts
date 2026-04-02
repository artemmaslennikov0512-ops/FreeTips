import { db } from "@/lib/db";
import type { PaymentAcceptSettings } from "@/lib/payment-accept-policy";

const MAIN_ID = "main";

export async function getPlatformPaymentSettings(): Promise<PaymentAcceptSettings> {
  const row = await db.platformPaymentSettings.findUnique({ where: { id: MAIN_ID } });
  if (!row) {
    return await db.platformPaymentSettings
      .create({
        data: { id: MAIN_ID },
      })
      .then((r) => ({
        globalPaymentsDisabled: r.globalPaymentsDisabled,
        paymentWhitelistUserIds: r.paymentWhitelistUserIds,
        paymentBlacklistUserIds: r.paymentBlacklistUserIds,
      }));
  }
  return {
    globalPaymentsDisabled: row.globalPaymentsDisabled,
    paymentWhitelistUserIds: row.paymentWhitelistUserIds,
    paymentBlacklistUserIds: row.paymentBlacklistUserIds,
  };
}

export type PlatformPaymentSettingsRow = {
  globalPaymentsDisabled: boolean;
  paymentWhitelistUserIds: string[];
  paymentBlacklistUserIds: string[];
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
      updatedAt: created.updatedAt,
    };
  }
  return {
    globalPaymentsDisabled: row.globalPaymentsDisabled,
    paymentWhitelistUserIds: row.paymentWhitelistUserIds,
    paymentBlacklistUserIds: row.paymentBlacklistUserIds,
    updatedAt: row.updatedAt,
  };
}

export async function updatePlatformPaymentSettings(data: {
  globalPaymentsDisabled?: boolean;
  paymentWhitelistUserIds?: string[];
  paymentBlacklistUserIds?: string[];
}): Promise<PlatformPaymentSettingsRow> {
  await db.platformPaymentSettings.upsert({
    where: { id: MAIN_ID },
    create: {
      id: MAIN_ID,
      globalPaymentsDisabled: data.globalPaymentsDisabled ?? false,
      paymentWhitelistUserIds: data.paymentWhitelistUserIds ?? [],
      paymentBlacklistUserIds: data.paymentBlacklistUserIds ?? [],
    },
    update: {
      ...(data.globalPaymentsDisabled !== undefined ? { globalPaymentsDisabled: data.globalPaymentsDisabled } : {}),
      ...(data.paymentWhitelistUserIds !== undefined ? { paymentWhitelistUserIds: data.paymentWhitelistUserIds } : {}),
      ...(data.paymentBlacklistUserIds !== undefined ? { paymentBlacklistUserIds: data.paymentBlacklistUserIds } : {}),
    },
  });
  return getPlatformPaymentSettingsRow();
}
