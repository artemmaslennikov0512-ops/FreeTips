/** Общие классы для страниц входа, регистрации, заявки — только переменные темы. */

export const AUTH_CARD_CLASS =
  "auth-page-card rounded-2xl border-0 bg-[var(--color-bg-sides)] p-8 shadow-[var(--shadow-card)]";

export const AUTH_INPUT_CLASS =
  "w-full rounded-xl border-0 bg-[var(--color-light-gray)] py-2.5 pl-10 pr-4 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-gold)]/30";

export const AUTH_INPUT_CLASS_NO_ICON =
  "w-full rounded-xl border-0 bg-[var(--color-light-gray)] py-2.5 px-4 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-gold)]/30";

/** Класс обводки поля с ошибкой на страницах входа/регистрации */
export const AUTH_ERROR_BORDER = "border-2 border-[var(--color-accent-red)] focus:ring-[var(--color-accent-red)]/30";

export const AUTH_BTN_PRIMARY =
  "auth-btn-primary w-full rounded-xl bg-[var(--color-brand-gold)] px-4 py-3 font-semibold text-[#0a192f] shadow-[var(--shadow-card)] hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200";
