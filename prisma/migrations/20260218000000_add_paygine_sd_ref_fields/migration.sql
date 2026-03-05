-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "paygineSdRef" VARCHAR(128);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "paygineOrderSdRef" VARCHAR(128);
