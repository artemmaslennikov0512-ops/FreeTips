-- AlterTable (таблица payout_requests создаётся в миграции 20260125; если её ещё нет — пропускаем)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payout_requests') THEN
    ALTER TABLE "payout_requests" ADD COLUMN IF NOT EXISTS "completedByUserId" VARCHAR(64);
  END IF;
END $$;
