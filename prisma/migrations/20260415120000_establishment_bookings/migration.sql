-- Брони столов заведения

CREATE TYPE "EstablishmentBookingStatus" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'SEATED',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED'
);

CREATE TABLE "establishment_bookings" (
  "id" TEXT NOT NULL,
  "establishmentId" TEXT NOT NULL,
  "tableId" TEXT,
  "guestName" VARCHAR(120) NOT NULL,
  "guestPhone" VARCHAR(40),
  "guestEmail" VARCHAR(255),
  "partySize" INTEGER NOT NULL DEFAULT 1,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "EstablishmentBookingStatus" NOT NULL DEFAULT 'PENDING',
  "notes" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "establishment_bookings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "establishment_bookings_establishmentId_startsAt_idx" ON "establishment_bookings"("establishmentId", "startsAt");
CREATE INDEX "establishment_bookings_tableId_startsAt_idx" ON "establishment_bookings"("tableId", "startsAt");

ALTER TABLE "establishment_bookings" ADD CONSTRAINT "establishment_bookings_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "establishment_bookings" ADD CONSTRAINT "establishment_bookings_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "establishment_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
