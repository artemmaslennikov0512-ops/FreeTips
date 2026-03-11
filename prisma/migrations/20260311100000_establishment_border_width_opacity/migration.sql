-- AlterTable: establishments - add borderWidthPx, borderOpacityPercent (бренд: толщина и прозрачность обводки)
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "borderWidthPx" INTEGER;
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "borderOpacityPercent" INTEGER;
