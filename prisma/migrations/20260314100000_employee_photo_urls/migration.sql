-- AlterTable: employees - add photoUrl (страница оплаты и ЛК), printCardPhotoUrl (карточка для печати)
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "photoUrl" VARCHAR(512);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "printCardPhotoUrl" VARCHAR(512);
