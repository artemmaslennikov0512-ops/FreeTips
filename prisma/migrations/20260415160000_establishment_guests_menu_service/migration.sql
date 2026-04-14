-- Гости, меню, сервис стола; связь брони с гостем

CREATE TABLE "establishment_guests" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(40),
    "email" VARCHAR(255),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishment_guests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "establishment_guests_establishmentId_idx" ON "establishment_guests"("establishmentId");

ALTER TABLE "establishment_guests" ADD CONSTRAINT "establishment_guests_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "establishment_bookings" ADD COLUMN "guestId" TEXT;
CREATE INDEX "establishment_bookings_guestId_idx" ON "establishment_bookings"("guestId");
ALTER TABLE "establishment_bookings" ADD CONSTRAINT "establishment_bookings_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "establishment_guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "establishment_menu_categories" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishment_menu_categories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "establishment_menu_categories_establishmentId_idx" ON "establishment_menu_categories"("establishmentId");

ALTER TABLE "establishment_menu_categories" ADD CONSTRAINT "establishment_menu_categories_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "establishment_menu_items" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "priceKop" BIGINT NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishment_menu_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "establishment_menu_items_categoryId_idx" ON "establishment_menu_items"("categoryId");

ALTER TABLE "establishment_menu_items" ADD CONSTRAINT "establishment_menu_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "establishment_menu_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "EstablishmentServiceSessionStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "establishment_service_sessions" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "employeeId" TEXT,
    "status" "EstablishmentServiceSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "establishment_service_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "establishment_service_sessions_establishmentId_status_idx" ON "establishment_service_sessions"("establishmentId", "status");
CREATE INDEX "establishment_service_sessions_tableId_status_idx" ON "establishment_service_sessions"("tableId", "status");
CREATE INDEX "establishment_service_sessions_employeeId_idx" ON "establishment_service_sessions"("employeeId");

ALTER TABLE "establishment_service_sessions" ADD CONSTRAINT "establishment_service_sessions_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "establishment_service_sessions" ADD CONSTRAINT "establishment_service_sessions_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "establishment_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "establishment_service_sessions" ADD CONSTRAINT "establishment_service_sessions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
