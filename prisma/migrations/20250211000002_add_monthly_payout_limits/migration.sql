-- AlterTable (таблица users создаётся в миграции 20260125; если её ещё нет — пропускаем)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "payoutMonthlyLimitCount" INTEGER;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "payoutMonthlyLimitKop" BIGINT;
  END IF;
END $$;
