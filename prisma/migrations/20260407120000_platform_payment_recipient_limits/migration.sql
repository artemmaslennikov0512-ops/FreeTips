-- Лимиты приёма: потолок баланса получателя и число незавершённых платежей в окне.
ALTER TABLE "platform_payment_settings" ADD COLUMN "recipientMaxBalanceKop" BIGINT;
ALTER TABLE "platform_payment_settings" ADD COLUMN "recipientMaxConcurrentPendingPayments" INTEGER;
ALTER TABLE "platform_payment_settings" ADD COLUMN "recipientPendingPaymentWindowMinutes" INTEGER;

CREATE INDEX "transactions_recipientId_status_createdAt_idx" ON "transactions" ("recipientId", "status", "createdAt");
