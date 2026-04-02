-- Общие поля TOTP для всех пользователей (ранее только админ)
ALTER TABLE "users" RENAME COLUMN "adminTotpEnabled" TO "totpEnabled";
ALTER TABLE "users" RENAME COLUMN "adminTotpSecretEnc" TO "totpSecretEnc";
