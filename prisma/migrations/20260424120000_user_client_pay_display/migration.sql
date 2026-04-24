-- Отображение на странице оплаты: ник/должность для гостей
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clientNickname" VARCHAR(120);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clientJobTitle" VARCHAR(120);
