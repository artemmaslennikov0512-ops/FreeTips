-- AlterTable
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "relocateStartedAt" TIMESTAMP(3);
