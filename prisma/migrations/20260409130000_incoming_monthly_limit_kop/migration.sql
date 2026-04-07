-- Отдельный месячный лимит суммы поступлений (чаевые) от лимита суммы вывода в месяц.
ALTER TABLE "users" ADD COLUMN "incomingMonthlyLimitKop" BIGINT;
UPDATE "users"
SET "incomingMonthlyLimitKop" = "payoutMonthlyLimitKop"
WHERE "incomingMonthlyLimitKop" IS NULL AND "payoutMonthlyLimitKop" IS NOT NULL;

ALTER TABLE "system_default_limits" ADD COLUMN "incomingMonthlyLimitKop" BIGINT;
UPDATE "system_default_limits"
SET "incomingMonthlyLimitKop" = "payoutMonthlyLimitKop"
WHERE "id" = 'default' AND "incomingMonthlyLimitKop" IS NULL AND "payoutMonthlyLimitKop" IS NOT NULL;
