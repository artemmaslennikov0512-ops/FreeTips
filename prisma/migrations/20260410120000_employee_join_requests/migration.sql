-- Заявки официантов на подключение к заведению по коду точки.
CREATE TABLE "employee_join_requests" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RegistrationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" VARCHAR(1000),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_join_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_join_requests_establishmentId_status_idx" ON "employee_join_requests"("establishmentId", "status");
CREATE INDEX "employee_join_requests_userId_status_idx" ON "employee_join_requests"("userId", "status");

ALTER TABLE "employee_join_requests" ADD CONSTRAINT "employee_join_requests_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_join_requests" ADD CONSTRAINT "employee_join_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
