-- Сутки для лимита заказов считаются с 00:00 по Москве; имя колонки без «Utc».
ALTER TABLE "platform_payment_settings" RENAME COLUMN "recipientMaxPayInitsPerUtcDay" TO "recipientMaxPayInitsPerDay";
