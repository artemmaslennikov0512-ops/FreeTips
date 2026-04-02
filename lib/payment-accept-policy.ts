/**
 * Политика приёма чаевых по платёжным ссылкам: глобальный стоп, белый и чёрный списки аккаунтов.
 */

export type PaymentAcceptSettings = {
  globalPaymentsDisabled: boolean;
  paymentWhitelistUserIds: readonly string[];
  paymentBlacklistUserIds: readonly string[];
};

export function recipientCanAcceptIncomingTips(recipientId: string, settings: PaymentAcceptSettings): boolean {
  if (settings.globalPaymentsDisabled) {
    return settings.paymentWhitelistUserIds.includes(recipientId);
  }
  return !settings.paymentBlacklistUserIds.includes(recipientId);
}
