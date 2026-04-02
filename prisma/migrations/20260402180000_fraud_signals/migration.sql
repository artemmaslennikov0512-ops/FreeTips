-- CreateTable
CREATE TABLE "fraud_signals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleCode" VARCHAR(64) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fraud_signals_userId_idx" ON "fraud_signals"("userId");

-- CreateIndex
CREATE INDEX "fraud_signals_createdAt_idx" ON "fraud_signals"("createdAt");

-- CreateIndex
CREATE INDEX "fraud_signals_ruleCode_idx" ON "fraud_signals"("ruleCode");

-- AddForeignKey
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
