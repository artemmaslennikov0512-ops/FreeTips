-- AlterTable
ALTER TABLE "tip_links" ADD COLUMN "employeeId" VARCHAR(64);

-- AlterTable
ALTER TABLE "establishments" ADD COLUMN "tipPoolUserId" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "establishments_tipPoolUserId_key" ON "establishments"("tipPoolUserId");

-- CreateIndex
CREATE INDEX "tip_links_employeeId_idx" ON "tip_links"("employeeId");

ALTER TABLE "tip_links" ADD CONSTRAINT "tip_links_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "establishments" ADD CONSTRAINT "establishments_tipPoolUserId_fkey" FOREIGN KEY ("tipPoolUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
