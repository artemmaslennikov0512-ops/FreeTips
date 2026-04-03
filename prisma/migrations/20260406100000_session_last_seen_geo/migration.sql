-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sessions" ADD COLUMN "geoCountry" VARCHAR(128);
ALTER TABLE "sessions" ADD COLUMN "geoCity" VARCHAR(128);

UPDATE "sessions" SET "lastSeenAt" = "createdAt";
