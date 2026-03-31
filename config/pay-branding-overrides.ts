/**
 * Персональное оформление страницы чаевых только для указанных slug.
 * Поля совпадают с брендингом заведения (см. GET /api/pay/[slug]).
 * Цвета — только #RRGGBB (как в PayPageClient).
 */
/** Slug страницы /pay/:slug — доп. класс `pay-page--m5-competition` в PayPageClient (глобальные стили). */
export const PAY_PAGE_M5_SHELL_SLUGS = new Set(["ahmedm5f90"]);

export function isPayPageM5ShellSlug(slug: string): boolean {
  return PAY_PAGE_M5_SHELL_SLUGS.has(slug.trim().toLowerCase());
}

export type PayPageBrandingOverride = {
  logoUrl?: string;
  logoOpacityPercent?: number | null;
  primaryColor?: string;
  secondaryColor?: string;
  mainBackgroundColor?: string;
  blocksBackgroundColor?: string;
  fontColor?: string;
  borderColor?: string;
  borderWidthPx?: number | null;
  borderOpacityPercent?: number | null;
};

export const PAY_PAGE_BRANDING_OVERRIDES: Partial<Record<string, PayPageBrandingOverride>> = {
  /** В стиле ЛК BMW M5 Competition: карбон, золото калиперов, приглушённая обводка */
  ahmedm5f90: {
    primaryColor: "#c9a962",
    secondaryColor: "#14161c",
    mainBackgroundColor: "#08090b",
    blocksBackgroundColor: "#1c1f28",
    fontColor: "#e8eaef",
    borderColor: "#8a7344",
    borderWidthPx: 1,
    borderOpacityPercent: 82,
  },
  /** Отдельный визуал только для /pay/ahmedm5f90-1; ahmedm5f90 и прочие slug не меняются. */
  "ahmedm5f90-1": {
    primaryColor: "#14b8a6",
    secondaryColor: "#134e4a",
    mainBackgroundColor: "#042f2e",
    blocksBackgroundColor: "#115e59",
    fontColor: "#ecfdf5",
    borderColor: "#2dd4bf",
    borderWidthPx: 2,
    borderOpacityPercent: 80,
  },
};
