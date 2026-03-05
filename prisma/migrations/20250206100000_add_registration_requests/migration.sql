-- CreateEnum
CREATE TYPE "RegistrationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable (FK на registration_tokens добавляется в миграции 20260125, т.к. эта таблица создаётся там)
CREATE TABLE "registration_requests" (
    "id" TEXT NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "dateOfBirth" VARCHAR(20) NOT NULL,
    "establishment" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "activityType" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "status" "RegistrationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "registrationTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registration_requests_registrationTokenId_key" ON "registration_requests"("registrationTokenId");

-- CreateIndex
CREATE INDEX "registration_requests_status_idx" ON "registration_requests"("status");

-- CreateIndex
CREATE INDEX "registration_requests_createdAt_idx" ON "registration_requests"("createdAt");
