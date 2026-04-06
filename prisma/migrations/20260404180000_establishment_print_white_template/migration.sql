-- AlterTable
ALTER TABLE "establishments" ADD COLUMN "printCardTemplate" VARCHAR(32),
ADD COLUMN "printPartnerLogoUrl" VARCHAR(512),
ADD COLUMN "printQrHintText" VARCHAR(160),
ADD COLUMN "printBannerText" VARCHAR(100),
ADD COLUMN "printBannerSubtext" VARCHAR(160);
