-- Ускорение выборок заявок на вывод по пользователю/статусу с сортировкой по дате.
CREATE INDEX "payout_requests_userId_status_createdAt_idx"
ON "payout_requests"("userId", "status", "createdAt");
