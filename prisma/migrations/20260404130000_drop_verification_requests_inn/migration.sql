-- Drop INN from verification requests (passport + documents suffice for PD check).
ALTER TABLE "verification_requests" DROP COLUMN IF EXISTS "inn";
