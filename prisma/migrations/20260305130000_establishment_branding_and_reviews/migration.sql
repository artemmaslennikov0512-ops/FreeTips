-- AlterTable: White Label colors
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "primaryColor" VARCHAR(20);
ALTER TABLE "establishments" ADD COLUMN IF NOT EXISTS "secondaryColor" VARCHAR(20);

-- CreateTable: employee reviews
CREATE TABLE IF NOT EXISTS "employee_reviews" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "employee_reviews_employeeId_idx" ON "employee_reviews"("employeeId");

ALTER TABLE "employee_reviews" DROP CONSTRAINT IF EXISTS "employee_reviews_employeeId_fkey";
ALTER TABLE "employee_reviews" ADD CONSTRAINT "employee_reviews_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
