-- AlterTable registration_requests: тип заявки (заведение / отдельный получатель) и дополнительные поля
ALTER TABLE "registration_requests" ADD COLUMN "requestType" VARCHAR(20) NOT NULL DEFAULT 'individual';
ALTER TABLE "registration_requests" ADD COLUMN "companyName" VARCHAR(255);
ALTER TABLE "registration_requests" ADD COLUMN "companyRole" VARCHAR(255);
ALTER TABLE "registration_requests" ADD COLUMN "employeeCount" INTEGER;
ALTER TABLE "registration_requests" ADD COLUMN "adminFullName" VARCHAR(255);
ALTER TABLE "registration_requests" ADD COLUMN "adminContactPhone" VARCHAR(50);

-- CreateIndex
CREATE INDEX "registration_requests_requestType_idx" ON "registration_requests"("requestType");
