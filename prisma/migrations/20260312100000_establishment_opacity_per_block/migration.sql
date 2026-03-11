-- AlterTable: establishments - add opacity per block (main bg, blocks bg, secondary)
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "mainBackgroundOpacityPercent" INTEGER;
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "blocksBackgroundOpacityPercent" INTEGER;
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "secondaryOpacityPercent" INTEGER;
