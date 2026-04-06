-- Заявки на подключение: причина отказа и аудит рассмотрения
ALTER TABLE "registration_requests" ADD COLUMN "rejectionReason" VARCHAR(1000);
ALTER TABLE "registration_requests" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "registration_requests" ADD COLUMN "reviewedByUserId" VARCHAR(64);
