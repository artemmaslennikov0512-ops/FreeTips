-- AlterTable
ALTER TABLE "payout_requests" ADD COLUMN IF NOT EXISTS "rejectionReason" VARCHAR(500);
