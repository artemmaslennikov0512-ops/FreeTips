/**
 * Диапазон суммы одного платежа (чаевых), копейки.
 * Синхронизировано с createPaymentSchema и страницей оплаты.
 */

export const PAYMENT_MIN_AMOUNT_KOP = 100; // 1 ₽
export const PAYMENT_MAX_AMOUNT_KOP = 100_000; // 1 000 ₽
