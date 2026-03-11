-- AlterTable: users - add savingFor (на что копит официант, показывается на странице оплаты)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "savingFor" VARCHAR(500);
