/**
 * Повторяющиеся классы экранов оплаты / результата (карточка, иконки, редирект).
 */

export const PAY_SUCCESS_FLOW_OUTER = "pay-success-always-light flex min-h-screen min-h-[100dvh] w-full flex-col items-center justify-center px-4 py-8";

/** Геометрия белой карточки; префикс `pay-success-card` + опционально ` pay-success-card--m5` задаётся в JSX. */
export const PAY_SUCCESS_CARD_GEOMETRY =
  "w-full max-w-sm rounded-2xl border border-[var(--color-brand-gold)]/40 bg-white p-8 text-center shadow-[var(--shadow-card)]";

export const PAY_RESULT_ICON_ERROR =
  "pay-result-icon pay-result-icon-error mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-red)]/15";

export const PAY_RESULT_ICON_SUCCESS =
  "pay-result-icon pay-result-icon-success mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-emerald)]/15";

export const PAY_RESULT_ICON_PENDING =
  "pay-result-icon mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15";

export const PAY_RESULT_TITLE = "font-[family:var(--font-playfair)] text-2xl font-semibold text-[#0a192f]";

export const PAY_RESULT_SUBTITLE_MUTED = "mt-3 text-center text-sm text-[#2d3748]";

const PAY_RESULT_CTA_PRIMARY =
  "inline-block rounded-xl bg-[var(--color-navy)] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]/50";

export const PAY_RESULT_CTA_PRIMARY_BLOCK = `mt-8 ${PAY_RESULT_CTA_PRIMARY}`;

export const PAY_ERROR_ALERT = "mt-2 text-center text-sm text-[var(--color-accent-red)]";

/** Простые сообщения на /pay/redirect */
export const PAY_NOTICE_PAGE = "mx-auto max-w-md px-4 py-12 text-center";

export const PAY_NOTICE_LINK_HOME = "mt-4 inline-block text-[var(--color-accent-gold)] hover:underline";

export const PAY_PAGE_CENTERED_NARROW = "mx-auto max-w-md px-4";

export const PAY_PAGE_FATAL_WRAP =
  "mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center";

export const PAY_PAGE_FATAL_HOME_LINK = "mt-6 text-[var(--color-accent-gold)] hover:opacity-90 hover:underline";

/** Ошибка на странице оплаты за столом (светлая/тёмная тема) */
export const TABLE_PAY_GUEST_ERROR = "text-sm text-red-600 dark:text-red-300";
