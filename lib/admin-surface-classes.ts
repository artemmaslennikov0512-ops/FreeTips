/**
 * Поверхности контента админки: всё, что рендерится внутри `.admin-panel` / `#main-content`.
 *
 * Важно: не задавать фон через `bg-[var(--color-navy)]` или `bg-[var(--color-dark-gray)]` для таких блоков —
 * в `[data-theme="dark"]` эти переменные в :root становятся светлыми, и блок «ломается» визуально.
 * Здесь — фиксированные тёмные поля (#3c414a, как --dark-form-surface-bg) и карточка `cabinet-section-header` (глобальные стили
 * уже подстраивают светлую/тёмную тему сайта для админки).
 *
 * Новые страницы админки: импортируйте отсюда карточку/инпуты вместо дублирования длинных строк Tailwind.
 */

const FIELD_BASE =
  "w-full rounded-lg border border-white/20 bg-[#3c414a] px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-[var(--color-brand-gold)] focus:ring-1 focus:ring-[var(--color-brand-gold)]/35";

/** Узкая колонка страницы (2FA, похожие формы). */
export const ADMIN_PANEL_PAGE_NARROW =
  "mx-auto w-full max-w-2xl px-4 py-2 text-center text-white";

/** Широкая колонка (списки, несколько карточек). */
export const ADMIN_PANEL_PAGE_WIDE =
  "mx-auto w-full max-w-3xl space-y-8 px-4 py-8 text-center text-white";

/** Очень широкая колонка (таблицы сессий и т.п.). */
export const ADMIN_PANEL_PAGE_XL =
  "mx-auto w-full max-w-7xl space-y-8 px-4 py-8 text-center text-white";

/** Карточка секции на всю ширину родителя (внутри PAGE_WIDE). */
export const ADMIN_PANEL_CARD =
  "cabinet-section-header rounded-3xl border-0 p-8 text-center text-white";

/** Узкая карточка по центру (форма 2FA и т.п.). */
export const ADMIN_PANEL_CARD_NARROW =
  `${ADMIN_PANEL_CARD} mx-auto mt-6 w-full max-w-lg sm:p-10`;

export const ADMIN_PANEL_INPUT = `mx-auto max-w-md ${FIELD_BASE} text-left`;

/** Однострочное поле на всю ширину карточки (формы со списками и т.п.). */
export const ADMIN_PANEL_INPUT_FULL_WIDTH = `mx-auto w-full ${FIELD_BASE} text-left`;

/** То же, без `mx-auto` — для flex-строк (readonly-ссылка рядом с кнопкой и т.п.). */
export const ADMIN_PANEL_INPUT_STRETCH = `${FIELD_BASE} w-full text-left`;

export const ADMIN_PANEL_INPUT_OTP =
  `${ADMIN_PANEL_INPUT} text-center text-lg tracking-[0.35em] pl-[0.35em]`;

/** Многострочное поле на той же подложке, что и инпуты. */
export const ADMIN_PANEL_TEXTAREA = `mt-2 w-full min-h-[120px] ${FIELD_BASE} text-left font-mono`;

export const ADMIN_PANEL_ALERT_OK =
  "rounded-xl border-0 bg-emerald-950/35 px-5 py-3.5 text-sm text-emerald-50 shadow-[0_2px_14px_rgba(16,185,129,0.22)]";

export const ADMIN_PANEL_ALERT_ERR =
  "rounded-xl border-0 bg-red-950/35 px-5 py-3.5 text-sm text-red-50 shadow-[0_2px_14px_rgba(248,113,113,0.22)]";

/** Предупреждение (например сохранено с неизвестными логинами). */
export const ADMIN_PANEL_ALERT_WARN =
  "rounded-xl border-0 bg-amber-950/40 px-5 py-3.5 text-sm text-amber-50 shadow-[0_2px_14px_rgba(251,191,36,0.2)]";

/** Обёртка для экранов «загрузка» / «ошибка» по центру страницы админки. */
export const ADMIN_PANEL_STATE_CENTER = "flex min-h-[60vh] items-center justify-center px-4";

/** То же, с меньшей минимальной высотой (короткие секции вроде списков настроек). */
export const ADMIN_PANEL_STATE_CENTER_COMPACT = "flex min-h-[50vh] items-center justify-center px-4";
