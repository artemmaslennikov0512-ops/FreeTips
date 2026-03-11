-- AlterTable: establishments - add print card size (width/height in mm)
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "printCardWidthMm" INTEGER;
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "printCardHeightMm" INTEGER;
