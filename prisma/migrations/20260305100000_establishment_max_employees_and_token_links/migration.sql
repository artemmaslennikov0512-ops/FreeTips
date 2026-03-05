-- AlterTable: establishments - add maxEmployeesCount
ALTER TABLE "establishments" ADD COLUMN "maxEmployeesCount" INTEGER;

-- AlterTable: registration_tokens - add establishmentId, employeeId
ALTER TABLE "registration_tokens" ADD COLUMN "establishmentId" VARCHAR(64);
ALTER TABLE "registration_tokens" ADD COLUMN "employeeId" VARCHAR(64);

-- CreateIndex
CREATE INDEX "registration_tokens_establishmentId_idx" ON "registration_tokens"("establishmentId");
CREATE INDEX "registration_tokens_employeeId_idx" ON "registration_tokens"("employeeId");

-- AddForeignKey
ALTER TABLE "registration_tokens" ADD CONSTRAINT "registration_tokens_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registration_tokens" ADD CONSTRAINT "registration_tokens_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
