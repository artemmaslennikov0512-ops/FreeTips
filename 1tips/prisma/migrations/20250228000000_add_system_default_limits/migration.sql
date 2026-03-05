-- CreateTable
CREATE TABLE "system_default_limits" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "payoutDailyLimitCount" INTEGER,
    "payoutDailyLimitKop" BIGINT,
    "payoutMonthlyLimitCount" INTEGER,
    "payoutMonthlyLimitKop" BIGINT,
    "autoConfirmPayouts" BOOLEAN NOT NULL DEFAULT false,
    "autoConfirmPayoutThresholdKop" BIGINT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_default_limits_pkey" PRIMARY KEY ("id")
);
