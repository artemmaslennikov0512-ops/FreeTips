-- Семантика: не «окно для подсчёта», а минимальный интервал между созданием заказов (мин).
ALTER TABLE "platform_payment_settings" RENAME COLUMN "recipientPendingPaymentWindowMinutes" TO "recipientMinMinutesBetweenPayInits";
