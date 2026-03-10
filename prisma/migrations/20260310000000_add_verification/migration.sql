-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "verificationRejectionReason" VARCHAR(1000);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "birthDate" VARCHAR(20) NOT NULL,
    "passportSeries" VARCHAR(10) NOT NULL,
    "passportNumber" VARCHAR(20) NOT NULL,
    "inn" VARCHAR(20) NOT NULL,
    "status" "RegistrationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" VARCHAR(1000),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_documents" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "filePath" VARCHAR(512) NOT NULL,
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verification_requests_userId_idx" ON "verification_requests"("userId");

-- CreateIndex
CREATE INDEX "verification_requests_status_idx" ON "verification_requests"("status");

-- CreateIndex
CREATE INDEX "verification_requests_createdAt_idx" ON "verification_requests"("createdAt");

-- CreateIndex
CREATE INDEX "verification_documents_requestId_idx" ON "verification_documents"("requestId");

-- CreateIndex
CREATE INDEX "verification_documents_downloadedAt_idx" ON "verification_documents"("downloadedAt");

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
