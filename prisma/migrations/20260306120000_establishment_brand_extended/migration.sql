-- AlterTable: establishments - add mainBackgroundColor, blocksBackgroundColor, fontColor
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "mainBackgroundColor" VARCHAR(20);
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "blocksBackgroundColor" VARCHAR(20);
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "fontColor" VARCHAR(20);
