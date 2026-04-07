-- Было: потолок баланса. Стало: макс. сумма входящих за календарные сутки МСК (коп.).
ALTER TABLE "platform_payment_settings" RENAME COLUMN "recipientMaxBalanceKop" TO "recipientMaxIncomingKopPerMskDay";
