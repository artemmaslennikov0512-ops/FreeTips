-- AlterTable: establishments — цвет подписи «Отсканируйте для чаевых» на карточке печати
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "printCardFooterColor" VARCHAR(20);
