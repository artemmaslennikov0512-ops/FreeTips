-- TOTP для входа в админку (ADMIN / SUPERADMIN)
ALTER TABLE "users" ADD COLUMN "adminTotpEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "adminTotpSecretEnc" TEXT;
