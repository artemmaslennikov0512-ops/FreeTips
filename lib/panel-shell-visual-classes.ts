/**
 * Повторяющиеся визуальные привязки панелей (ЛК, админка, заведение): границы, золото, шаги типографики.
 * Не заменяет правила в globals.css — только дубли в JSX.
 */

// --- Золото / нейтральные границы

/** Как плитки «Быстрые действия» в ЛК (рамка золота ~55%) */
const PANEL_BORDER_GOLD_QUICK_TILE = "border border-[rgba(197,165,114,0.55)]";

/** Обводка вторичных кнопок «как у заведения» / тулбар */
const PANEL_BORDER_GOLD_40 = "border border-[var(--color-brand-gold)]/40";

const PANEL_NAV_WRAP_ROUNDED = "rounded-[10px]";

/** Общая «коробка» навигации в сайдбаре: рамка и тень без заливки (как блок ФИО; детали в globals.css). */
const PANEL_NAV_WRAP_BASE = `flex flex-col gap-0 ${PANEL_NAV_WRAP_ROUNDED} ${PANEL_BORDER_GOLD_QUICK_TILE} p-1.5 pb-2 shadow-[var(--shadow-subtle)]`;

export const PANEL_NAV_WRAP_CABINET = PANEL_NAV_WRAP_BASE;

/** Линия под мобильной полоской (тема + меню) */
export const PANEL_TOP_SHELL_GOLD_DIVIDER =
  "mx-0 h-0 w-full shrink-0 border-0 border-t border-[var(--color-brand-gold)]/45";

/** Разделитель над блоком «Назад» в карточке */
export const PANEL_MOBILE_BACK_DIVIDER = "shrink-0 border-b border-white/10 lg:hidden";

// --- Типографика и ряд ссылки в сайдбаре

export const PANEL_SIDEBAR_NAV_LINK_ROW =
  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.9375rem] font-normal transition-colors";

export const PANEL_SIDEBAR_NAV_LINK_INACTIVE_CABINET =
  "border border-transparent text-[var(--color-text)]/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]";

export const PANEL_SIDEBAR_NAV_GROUP_SEPARATOR_CABINET =
  "mt-3 border-t border-[var(--color-brand-gold)]/12 pt-3 first:mt-0 first:border-t-0 first:pt-2";

export const PANEL_SIDEBAR_NAV_GROUP_TITLE_ADMIN =
  "px-2.5 pb-1.5 pt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]/45";

export const PANEL_SIDEBAR_NAV_ICON = "cabinet-nav-item-icon h-[18px] w-[18px] shrink-0";

export const PANEL_SIDEBAR_NAV_ACTIVE_ADMIN = "cabinet-nav-active border font-medium";

/** Кнопка «Выйти» в сайдбаре заведения (моб.) */
export const PANEL_ESTABLISHMENT_SIDEBAR_LOGOUT =
  "establishment-sidebar-logout mt-3 shrink-0 flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-[0.8125rem] font-medium text-[var(--color-text)]/80 transition-colors hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]";

// --- Кабинет заведения: «Назад»

export const PANEL_ESTABLISHMENT_BACK_BTN_BLOCK =
  `inline-flex items-center gap-2 rounded-xl ${PANEL_BORDER_GOLD_40} bg-[var(--color-dark-gray)]/5 px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-dark-gray)]/10`;

export const PANEL_ESTABLISHMENT_BACK_BTN_TOOLBAR =
  `inline-flex h-11 min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl ${PANEL_BORDER_GOLD_40} bg-[var(--color-dark-gray)]/5 px-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-dark-gray)]/10 sm:px-3`;

// --- Основная карточка контента (glass + скругление + сброс на max-lg где нужно)

export const PANEL_APP_MAIN_SURFACE_ADMIN =
  "admin-main-block cabinet-main-block app-panel-main-surface relative z-10 mt-0 mr-0 mb-3 ml-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col rounded-lg border-x border-b border-white/10 backdrop-blur-xl md:rounded-[10px] lg:z-0 lg:mr-3 lg:ml-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none lg:backdrop-blur-none max-lg:mb-0 max-lg:ml-0 max-lg:mr-0 max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none max-lg:backdrop-blur-none";

/** Фон задаётся через style (бренд); класс без bg-white */
export const PANEL_APP_MAIN_SURFACE_CABINET =
  "cabinet-main-block app-panel-main-surface relative z-10 mt-0 mr-0 mb-3 ml-0 flex min-h-0 w-full max-w-full flex-1 flex-col rounded-lg border-x border-b border-white/10 backdrop-blur-xl md:rounded-[10px] lg:z-0 lg:mr-3 lg:ml-3 max-lg:mb-0 max-lg:ml-0 max-lg:mr-0 max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none max-lg:backdrop-blur-none";

export const PANEL_APP_MAIN_SURFACE_ESTABLISHMENT =
  "cabinet-main-block app-panel-main-surface relative z-10 mt-0 mr-0 mb-3 ml-0 flex min-h-0 flex-1 flex-col rounded-lg border-x border-b border-white/10 backdrop-blur-xl md:rounded-[10px] lg:z-0 lg:mr-0 lg:ml-3 lg:rounded-[10px] max-lg:mb-0 max-lg:ml-0 max-lg:mr-0 max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none max-lg:backdrop-blur-none";

export const PANEL_MAIN_CONTENT_INNER_ADMIN_CABINET =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden px-4 py-3 sm:px-6 md:py-6 lg:p-8";

/** Только приложение админки: без `overflow-x-hidden`, чтобы выпадающие списки не попадали под соседние блоки / не обрезались. */
export const PANEL_MAIN_CONTENT_INNER_ADMIN_APP =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-visible px-4 py-3 sm:px-6 md:py-6 lg:p-8";

export const PANEL_MAIN_CONTENT_INNER_ESTABLISHMENT =
  "flex min-h-0 min-w-0 flex-1 flex-col px-4 py-2 sm:px-6 sm:py-3 md:py-4 lg:px-8 lg:py-5";

// --- Заголовки / подзаголовки страниц (Playfair — см. .cursor/rules/typography-inter.mdc)

const PLAYFAIR = "font-[family:var(--font-playfair)]";

/** Админка: h1 (светлая/тёмная тема — через --color-text) */
export const PANEL_PAGE_TITLE_ADMIN = `${PLAYFAIR} text-xl font-semibold text-[var(--color-text)] sm:text-2xl`;

export const PANEL_PAGE_TITLE_ADMIN_CENTERED = `text-center ${PANEL_PAGE_TITLE_ADMIN}`;

export const PANEL_PAGE_TITLE_ADMIN_XL_CENTERED = `text-center ${PLAYFAIR} text-2xl font-semibold text-[var(--color-text)]`;

export const PANEL_PAGE_TITLE_ADMIN_ON_DARK_CENTERED = `text-center ${PLAYFAIR} text-xl font-semibold text-[var(--color-on-dark)] sm:text-2xl`;

/** Заведение: герой-заголовок раздела (тёмная зона) */
export const PANEL_PAGE_TITLE_ESTABLISHMENT_HERO_ON_DARK = `cabinet-dashboard-name-hero ${PLAYFAIR} text-[var(--color-on-dark)]`;

export const PANEL_PAGE_TITLE_ESTABLISHMENT_HERO_WHITE = `cabinet-dashboard-name-hero ${PLAYFAIR} text-[var(--color-text)]`;

/** Заведение: компактный заголовок экрана */
export const PANEL_PAGE_TITLE_ESTABLISHMENT_WHITE_LG = `${PLAYFAIR} text-lg font-semibold text-[var(--color-text)] text-center`;

export const PANEL_PAGE_TITLE_ESTABLISHMENT_WHITE_LG_FLUSH = `${PLAYFAIR} text-lg font-semibold text-[var(--color-text)]`;

export const PANEL_PAGE_TITLE_ESTABLISHMENT_WHITE_LG_FLEX_ROW = `${PLAYFAIR} text-lg font-semibold text-[var(--color-text)] flex w-full items-center justify-center gap-2`;

/** Подпись под компактным заголовком заведения (join / leave и т.п.) */
export const PANEL_PAGE_SUBTITLE_ESTABLISHMENT_INTRO = "mt-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]";

/** Заголовок в шапке выезжающего сайдбара заведения */
export const PANEL_ESTABLISHMENT_SIDEBAR_TITLE_LINE =
  "inline-block font-[family:var(--font-playfair)] text-[1.0625rem] font-bold leading-tight text-[var(--color-text)]";

/** ЛК: заголовок страницы */
export const PANEL_PAGE_TITLE_CABINET = `${PLAYFAIR} text-xl font-semibold text-[var(--color-text)] sm:text-2xl`;

export const PANEL_PAGE_TITLE_CABINET_CENTERED_TIGHT = `${PLAYFAIR} text-xl font-semibold text-[var(--color-text)] text-center`;

/** ЛК: заголовок секции h2 */
export const PANEL_SECTION_TITLE_CABINET_LG = `${PLAYFAIR} text-lg font-semibold text-[var(--color-text)]`;

export const PANEL_SECTION_TITLE_CABINET_LG_ON_DARK = `${PLAYFAIR} text-lg font-semibold text-white`;

/** ЛК: заголовок блока h3 */
export const PANEL_CARD_TITLE_CABINET_XL = `${PLAYFAIR} text-xl font-semibold text-[var(--color-text)]`;

export const PANEL_CARD_TITLE_CABINET_XL_CENTERED = `text-center ${PANEL_CARD_TITLE_CABINET_XL}`;

// --- Карточки-секции .cabinet-section-header (админка)

export const PANEL_SECTION_CARD_SM = "cabinet-section-header rounded-2xl border-0 p-4 sm:p-6";

export const PANEL_SECTION_CARD_P4 = "cabinet-section-header rounded-2xl border-0 p-4";

export const PANEL_SECTION_CARD_ROUNDED_XL_P4 = "cabinet-section-header rounded-xl border-0 p-4";

export const PANEL_SECTION_CARD_ROUNDED_XL_P6_CENTERED =
  "cabinet-section-header rounded-xl border-0 p-6 text-center text-[var(--color-on-dark-muted)]";

export const PANEL_SECTION_CARD_FORM_SPACE = "cabinet-section-header space-y-4 rounded-2xl border-0 p-6 text-left";

export const PANEL_ADMIN_ESTABLISHMENTS_TABLE_WRAP =
  "admin-establishments-table cabinet-section-header max-lg:hidden overflow-x-auto rounded-xl border-0";

/** Подзаголовок под h1 в админке */
export const PANEL_PAGE_SUBTITLE_ADMIN_MUTED = "max-w-lg text-sm text-[var(--color-text-secondary)]";

export const PANEL_SECTION_CARD_ROUNDED_XL_EMPTY_WHITE =
  "cabinet-section-header rounded-xl border-0 px-6 py-8 text-center text-[var(--color-text-secondary)]";

export const PANEL_SECTION_TABLE_DESKTOP_WRAP = "cabinet-section-header max-lg:hidden overflow-x-auto rounded-xl border-0";

/** Карточка строки в мобильном списке админки */
export const PANEL_ADMIN_DASHBOARD_TABLE_CARD = "admin-dashboard-table cabinet-section-header rounded-2xl border-0 p-4 text-left";

/** Десктопная таблица заявок (верификация) */
export const PANEL_ADMIN_DASHBOARD_TABLE_DESKTOP = "admin-dashboard-table cabinet-section-header hidden min-h-[min(48dvh,520px)] w-full min-w-0 flex-1 overflow-auto rounded-xl border-0 text-left lg:block";

/** База для десктопной таблицы с модификаторами (подключения) */
export const PANEL_ADMIN_DASHBOARD_TABLE_DESKTOP_BASE =
  "admin-dashboard-table cabinet-section-header hidden max-w-full rounded-xl border-0 text-left lg:block";
