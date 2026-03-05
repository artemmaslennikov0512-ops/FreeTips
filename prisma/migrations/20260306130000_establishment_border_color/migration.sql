-- AlterTable: establishments - add borderColor
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "borderColor" VARCHAR(20);
