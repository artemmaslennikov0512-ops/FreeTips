-- AlterEnum: add ESTABLISHMENT_ADMIN and EMPLOYEE to UserRole
ALTER TYPE "UserRole" ADD VALUE 'ESTABLISHMENT_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'EMPLOYEE';

-- CreateTable: establishments
CREATE TABLE "establishments" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "phone" VARCHAR(50),
    "logoUrl" VARCHAR(512),
    "uniqueSlug" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: employees
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" VARCHAR(100),
    "coefficient" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "qrCodeIdentifier" VARCHAR(50) NOT NULL,
    "userId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payout_rules
CREATE TABLE "payout_rules" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "value" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_rules_pkey" PRIMARY KEY ("id")
);

-- AddColumn: users.establishmentId
ALTER TABLE "users" ADD COLUMN "establishmentId" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "establishments_uniqueSlug_key" ON "establishments"("uniqueSlug");
CREATE INDEX "establishments_uniqueSlug_idx" ON "establishments"("uniqueSlug");

CREATE UNIQUE INDEX "employees_qrCodeIdentifier_key" ON "employees"("qrCodeIdentifier");
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");
CREATE INDEX "employees_establishmentId_idx" ON "employees"("establishmentId");
CREATE INDEX "employees_qrCodeIdentifier_idx" ON "employees"("qrCodeIdentifier");

CREATE INDEX "payout_rules_establishmentId_idx" ON "payout_rules"("establishmentId");

CREATE INDEX "users_establishmentId_idx" ON "users"("establishmentId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payout_rules" ADD CONSTRAINT "payout_rules_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users" ADD CONSTRAINT "users_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
