-- Global push delivery dedupe across all devices for a user.
CREATE TABLE "tip_push_deliveries" (
    "userId" TEXT NOT NULL,
    "tipId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tip_push_deliveries_pkey" PRIMARY KEY ("userId","tipId")
);

CREATE INDEX "tip_push_deliveries_userId_createdAt_idx"
    ON "tip_push_deliveries"("userId", "createdAt");

ALTER TABLE "tip_push_deliveries"
    ADD CONSTRAINT "tip_push_deliveries_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
