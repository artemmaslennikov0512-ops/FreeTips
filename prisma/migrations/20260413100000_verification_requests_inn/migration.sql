-- ИНН в заявке верификации (форма: ФИО, дата рождения, паспорт, ИНН).
ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "inn" VARCHAR(14) NOT NULL DEFAULT '';
