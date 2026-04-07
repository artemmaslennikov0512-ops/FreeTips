-- Заявки официантов на выход из заведения (после одобрения администратора).
CREATE TABLE "employee_leave_requests" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RegistrationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" VARCHAR(1000),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_leave_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_leave_requests_establishmentId_status_idx" ON "employee_leave_requests"("establishmentId", "status");
CREATE INDEX "employee_leave_requests_userId_status_idx" ON "employee_leave_requests"("userId", "status");

ALTER TABLE "employee_leave_requests" ADD CONSTRAINT "employee_leave_requests_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_leave_requests" ADD CONSTRAINT "employee_leave_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
