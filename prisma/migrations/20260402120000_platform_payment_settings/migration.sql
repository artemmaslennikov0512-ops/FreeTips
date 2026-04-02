-- CreateTable
CREATE TABLE "platform_payment_settings" (
    "id" TEXT NOT NULL,
    "globalPaymentsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "paymentWhitelistUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "paymentBlacklistUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_payment_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "platform_payment_settings" ("id", "globalPaymentsDisabled", "updatedAt")
VALUES ('main', false, CURRENT_TIMESTAMP);
