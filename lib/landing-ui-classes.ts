import type { CSSProperties } from "react";

/**
 * Общие классы секций маркетингового лендинга (главная и блоки в `components/landing/*`).
 * Снижает дублирование длинных цепочек Tailwind и data-URL сетки.
 */

/** Вертикальные отступы типовой секции под hero. */
export const LANDING_SECTION_Y = "py-12 sm:py-16 lg:py-[100px]";

/** Якорная прокрутка с учётом фиксированного хедера. */
export const LANDING_SCROLL_MARGIN = "scroll-mt-24";

/** Внутренняя колонка: max-width + паддинги + слой над декоративным фоном. */
export const LANDING_SECTION_INNER =
  "relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:max-w-7xl 2xl:max-w-screen-2xl";

/** Слой с фоновым изображением-паттерном (cover). */
export const LANDING_DECO_PHOTO_BASE =
  "pointer-events-none absolute inset-0 z-[0] bg-cover bg-center bg-no-repeat";

/** Сетка из линий поверх секции (как у большинства блоков). */
export const LANDING_DECO_GRID_LAYER =
  "pointer-events-none absolute inset-0 z-[1] opacity-[0.04]";

/** Вариант сетки для FAQ: чуть заметнее, без отдельного фото-слоя. */
export const LANDING_DECO_GRID_LAYER_FAQ =
  "pointer-events-none absolute inset-0 z-[0] opacity-[0.06]";

export const LANDING_DECO_GRID_STYLE: CSSProperties = {
  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><path d='M0,0 L80,0 L80,80' fill='none' stroke='white' stroke-width='1.5'/></svg>")`,
  backgroundSize: "80px 80px",
};

/** Заголовок секции Playfair (h2), цвет задаётся в JSX. */
export const LANDING_HEADING_H2 =
  "font-[family:var(--font-playfair)] text-2xl font-semibold sm:text-3xl lg:text-4xl";
