-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('RECIPIENT', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('CREATED', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "uniqueId" SERIAL NOT NULL,
    "login" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'RECIPIENT',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "fullName" VARCHAR(255),
    "birthDate" VARCHAR(20),
    "establishment" VARCHAR(255),
    "apiKey" VARCHAR(64),
    "payoutDailyLimitCount" INTEGER,
    "payoutDailyLimitKop" BIGINT,
    "payoutMonthlyLimitCount" INTEGER,
    "payoutMonthlyLimitKop" BIGINT,
    "autoConfirmPayouts" BOOLEAN NOT NULL DEFAULT false,
    "autoConfirmPayoutThresholdKop" BIGINT,
    "paygineSdRef" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_uniqueId_key" ON "users"("uniqueId");

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" VARCHAR(512) NOT NULL,
    "deviceInfo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tip_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tip_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amountKop" BIGINT NOT NULL,
    "payerInfo" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" VARCHAR(255),
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountKop" BIGINT NOT NULL,
    "details" TEXT NOT NULL,
    "recipientName" VARCHAR(255),
    "status" "PayoutStatus" NOT NULL DEFAULT 'CREATED',
    "externalId" VARCHAR(255),
    "completedByUserId" VARCHAR(64),
    "feeKop" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_apiKey_key" ON "users"("apiKey");

-- CreateIndex
CREATE INDEX "users_login_idx" ON "users"("login");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_refreshToken_idx" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "tip_links_slug_key" ON "tip_links"("slug");

-- CreateIndex
CREATE INDEX "tip_links_userId_idx" ON "tip_links"("userId");

-- CreateIndex
CREATE INDEX "tip_links_slug_idx" ON "tip_links"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tip_links_userId_slug_key" ON "tip_links"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_externalId_key" ON "transactions"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_idempotencyKey_key" ON "transactions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "transactions_linkId_idx" ON "transactions"("linkId");

-- CreateIndex
CREATE INDEX "transactions_recipientId_idx" ON "transactions"("recipientId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_externalId_idx" ON "transactions"("externalId");

-- CreateIndex
CREATE INDEX "transactions_idempotencyKey_idx" ON "transactions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payout_requests_externalId_key" ON "payout_requests"("externalId");

-- CreateIndex
CREATE INDEX "payout_requests_userId_idx" ON "payout_requests"("userId");

-- CreateIndex
CREATE INDEX "payout_requests_status_idx" ON "payout_requests"("status");

-- CreateIndex
CREATE INDEX "payout_requests_externalId_idx" ON "payout_requests"("externalId");

-- CreateIndex
CREATE INDEX "payout_requests_createdAt_idx" ON "payout_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tip_links" ADD CONSTRAINT "tip_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "tip_links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "paygine_cubbies" (
    "id" TEXT NOT NULL,
    "sdRef" VARCHAR(128) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paygine_cubbies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "paygine_cubbies_sdRef_key" ON "paygine_cubbies"("sdRef");
CREATE INDEX "paygine_cubbies_sdRef_idx" ON "paygine_cubbies"("sdRef");
CREATE INDEX "paygine_cubbies_userId_idx" ON "paygine_cubbies"("userId");

ALTER TABLE "paygine_cubbies" ADD CONSTRAINT "paygine_cubbies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable registration_tokens (таблица registration_requests уже создана в 20250206; FK добавляем здесь)
CREATE TABLE "registration_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "createdById" TEXT NOT NULL,
    "usedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "registration_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registration_tokens_tokenHash_key" ON "registration_tokens"("tokenHash");
CREATE INDEX "registration_tokens_createdById_idx" ON "registration_tokens"("createdById");
CREATE INDEX "registration_tokens_usedById_idx" ON "registration_tokens"("usedById");
CREATE INDEX "registration_tokens_expiresAt_idx" ON "registration_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "registration_tokens" ADD CONSTRAINT "registration_tokens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registration_tokens" ADD CONSTRAINT "registration_tokens_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_registrationTokenId_fkey" FOREIGN KEY ("registrationTokenId") REFERENCES "registration_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
