ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "recipientCreditedKop" BIGINT,
  ADD COLUMN IF NOT EXISTS "recipientFeeChargedKop" BIGINT;
