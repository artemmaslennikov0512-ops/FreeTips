-- Присвоить постоянную кубышку (paygineSdRef) всем пользователям, у которых она ещё не задана.
-- Формат: FreeTips_w_<uniqueId>. В Paygine кубышка фактически создаётся при первом зачислении (Relocate).
UPDATE "users"
SET "paygineSdRef" = 'FreeTips_w_' || "uniqueId"::text
WHERE "paygineSdRef" IS NULL;
