-- AlterTable: establishments — прозрачность логотипа заведения (0–100), null = 100
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "logoOpacityPercent" INTEGER;
