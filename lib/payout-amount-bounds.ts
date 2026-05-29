/**
 * Диапазон суммы одной заявки на вывод (копейки).
 * Синхронизировано с createPayoutSchema и эндпоинтами SD Pay Out.
 */

export const PAYOUT_MIN_AMOUNT_KOP = 10_000; // 100 ₽
export const PAYOUT_MAX_AMOUNT_KOP = 10_000_000; // 100 000 ₽
/** Максимальное списание с баланса за одну операцию вывода (сумма + комиссия). */
export const PAYOUT_MAX_TOTAL_DEBIT_PER_OPERATION_KOP = 500_000; // 5 000 ₽
