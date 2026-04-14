-- Постоянная ссылка/QR оплаты меню по столу; статус PAID для будущей интеграции эквайринга

ALTER TYPE "EstablishmentTableOrderStatus" ADD VALUE 'PAID';

ALTER TABLE "establishment_tables" ADD COLUMN "tablePaySlug" VARCHAR(50);

CREATE UNIQUE INDEX "establishment_tables_tablePaySlug_key" ON "establishment_tables"("tablePaySlug");
