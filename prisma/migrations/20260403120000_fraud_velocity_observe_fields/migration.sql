-- Наблюдение без автоблокировок: IP входа/регистрации, IP инициатора оплаты
ALTER TABLE "users" ADD COLUMN "lastAuthIp" VARCHAR(64);

CREATE INDEX "users_lastAuthIp_idx" ON "users"("lastAuthIp");

ALTER TABLE "transactions" ADD COLUMN "initiatorIp" VARCHAR(64);

CREATE INDEX "transactions_initiatorIp_status_updatedAt_idx" ON "transactions"("initiatorIp", "status", "updatedAt");
