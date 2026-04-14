-- Заказы по столу для ЛК официанта (пречек; оплата отдельно)

CREATE TYPE "EstablishmentTableOrderStatus" AS ENUM ('OPEN', 'PRESENTED', 'CANCELLED');

CREATE TABLE "establishment_table_orders" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "serviceSessionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "EstablishmentTableOrderStatus" NOT NULL DEFAULT 'OPEN',
    "totalKop" BIGINT NOT NULL DEFAULT 0,
    "guestId" TEXT,
    "presentedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishment_table_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "establishment_table_orders_serviceSessionId_key" ON "establishment_table_orders"("serviceSessionId");
CREATE INDEX "establishment_table_orders_establishmentId_idx" ON "establishment_table_orders"("establishmentId");
CREATE INDEX "establishment_table_orders_employeeId_idx" ON "establishment_table_orders"("employeeId");

ALTER TABLE "establishment_table_orders" ADD CONSTRAINT "establishment_table_orders_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "establishment_table_orders" ADD CONSTRAINT "establishment_table_orders_serviceSessionId_fkey" FOREIGN KEY ("serviceSessionId") REFERENCES "establishment_service_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "establishment_table_orders" ADD CONSTRAINT "establishment_table_orders_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "establishment_table_orders" ADD CONSTRAINT "establishment_table_orders_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "establishment_guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "establishment_table_order_lines" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "nameSnapshot" VARCHAR(160) NOT NULL,
    "priceKopSnapshot" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "comment" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishment_table_order_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "establishment_table_order_lines_orderId_idx" ON "establishment_table_order_lines"("orderId");

ALTER TABLE "establishment_table_order_lines" ADD CONSTRAINT "establishment_table_order_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "establishment_table_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "establishment_table_order_lines" ADD CONSTRAINT "establishment_table_order_lines_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "establishment_menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
