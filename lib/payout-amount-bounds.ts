/**
 * Диапазон суммы одной заявки на вывод (копейки).
 * Синхронизировано с createPayoutSchema и эндпоинтами SD Pay Out.
 */

export const PAYOUT_MIN_AMOUNT_KOP = 10_000; // 100 ₽
export const PAYOUT_MAX_AMOUNT_KOP = 10_000_000; // 100 000 ₽
