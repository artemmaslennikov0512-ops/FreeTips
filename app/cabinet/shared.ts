/**
 * Общие типы и константы кабинета официанта.
 */

export type Stats = {
  balanceKop: number;
  totalReceivedKop: number;
  transactionsCount: number;
  payoutsPendingCount: number;
};

export const PAYOUT_STATUS_LABEL: Record<string, string> = {
  CREATED: "Создана",
  PROCESSING: "В обработке",
  COMPLETED: "Выполнена",
  REJECTED: "Отклонена",
};

/** Базовые стили инпутов ЛК: белый фон, чёрный текст, адаптивная граница. `cabinet-surface-input` — для перебива глобалок на тёмной карточке при светлой теме сайта. */
const INPUT_BASE =
  "cabinet-surface-input w-full rounded-xl border-2 bg-white px-4 py-2.5 text-[#0a192f] placeholder:text-[var(--color-muted)] transition-[border-color,box-shadow] duration-200 focus:outline-none focus:ring-2";
const INPUT_BORDER_NORMAL = "border-[var(--color-dark-gray)]/20 hover:border-[var(--color-dark-gray)]/35 focus:border-[var(--color-brand-gold)] focus:ring-[var(--color-brand-gold)]/30";
const INPUT_BORDER_ERROR = "border-[var(--color-accent-red)] focus:border-[var(--color-accent-red)] focus:ring-[var(--color-accent-red)]/30";

export function cabinetInputClassName(hasError: boolean): string {
  return `${INPUT_BASE} ${hasError ? INPUT_BORDER_ERROR : INPUT_BORDER_NORMAL}`;
}
