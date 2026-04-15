import { getPlatformPaymentSettings } from "@/lib/platform-payment-settings";
import { recipientCanAcceptIncomingTips } from "@/lib/payment-accept-policy";

/** Сообщение для плательщика при блокировке приёма по политике платформы. */
const PAYMENT_ACCEPT_BLOCKED_MESSAGE = "Приём чаевых временно недоступен";

export async function paymentAcceptBlockedReasonForRecipient(recipientId: string): Promise<string | null> {
  const settings = await getPlatformPaymentSettings();
  if (recipientCanAcceptIncomingTips(recipientId, settings)) return null;
  return PAYMENT_ACCEPT_BLOCKED_MESSAGE;
}
