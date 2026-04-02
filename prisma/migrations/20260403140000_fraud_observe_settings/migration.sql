ALTER TABLE "system_default_limits" ADD COLUMN "observePayoutWindowMinutes" INTEGER;
ALTER TABLE "system_default_limits" ADD COLUMN "observePayoutMinCount" INTEGER;
ALTER TABLE "system_default_limits" ADD COLUMN "observePayInitWindowMinutes" INTEGER;
ALTER TABLE "system_default_limits" ADD COLUMN "observePayInitMinCount" INTEGER;
ALTER TABLE "system_default_limits" ADD COLUMN "observePaySuccessIpWindowMinutes" INTEGER;
ALTER TABLE "system_default_limits" ADD COLUMN "observePaySuccessIpMinCount" INTEGER;
ALTER TABLE "system_default_limits" ADD COLUMN "observeSharedIpMinAccounts" INTEGER;
