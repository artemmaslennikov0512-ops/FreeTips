-- Залы и столы заведения (кабинет «Операции»)

CREATE TABLE "establishment_halls" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishment_halls_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "establishment_tables" (
    "id" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "externalCode" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishment_tables_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "establishment_halls_establishmentId_idx" ON "establishment_halls"("establishmentId");

CREATE INDEX "establishment_tables_hallId_idx" ON "establishment_tables"("hallId");

CREATE UNIQUE INDEX "establishment_tables_hallId_label_key" ON "establishment_tables"("hallId", "label");

ALTER TABLE "establishment_halls" ADD CONSTRAINT "establishment_halls_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "establishment_tables" ADD CONSTRAINT "establishment_tables_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "establishment_halls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
