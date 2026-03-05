-- Add columns for API key hash (new keys stored as hash only)
ALTER TABLE "users" ADD COLUMN "apiKeyPrefix" VARCHAR(20);
ALTER TABLE "users" ADD COLUMN "apiKeyHash" VARCHAR(64);
CREATE INDEX "users_apiKeyPrefix_idx" ON "users"("apiKeyPrefix");
