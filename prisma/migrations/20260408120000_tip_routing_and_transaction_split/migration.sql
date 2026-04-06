-- AlterTable
ALTER TABLE "establishments" ADD COLUMN "tipRoutingMode" VARCHAR(20);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "establishmentShareKop" BIGINT,
ADD COLUMN "poolShareRecipientId" VARCHAR(64);

-- CreateIndex
CREATE INDEX "transactions_poolShareRecipientId_idx" ON "transactions"("poolShareRecipientId");
