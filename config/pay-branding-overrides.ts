/**
 * Персональное оформление страницы чаевых только для указанных slug.
 * Поля совпадают с брендингом заведения (см. GET /api/pay/[slug]).
 * Цвета — только #RRGGBB (как в PayPageClient).
 */
/** Slug страницы /pay/:slug — класс `pay-page--m5-competition` до ответа API (глобальные стили). */
const PAY_PAGE_M5_SHELL_SLUGS = new Set(["ahmedm5f90", "ahmedm5f98"]);

export function isPayPageM5ShellSlug(slug: string): boolean {
  return PAY_PAGE_M5_SHELL_SLUGS.has(slug.trim().toLowerCase());
}

/**
 * Slug, для которых не накладывается брендинг M5 по логину получателя
 * (например отдельный визуал из PAY_PAGE_BRANDING_OVERRIDES).
 */
export const PAY_PAGE_SLUGS_SKIP_M5_LOGIN_BRANDING = new Set(["ahmedm5f90-1"]);

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

/** Страница оплаты в стиле ЛК BMW M5 Competition (синий/красный, карбон). */
export const PAY_PAGE_M5_COMPETITION_BRANDING: PayPageBrandingOverride = {
  primaryColor: "#1c69d4",
  secondaryColor: "#181b22",
  mainBackgroundColor: "#08090b",
  blocksBackgroundColor: "#1c1f28",
  fontColor: "#e8eaef",
  borderColor: "#1c69d4",
  borderWidthPx: 1,
  borderOpacityPercent: 48,
};

export const PAY_PAGE_BRANDING_OVERRIDES: Partial<Record<string, PayPageBrandingOverride>> = {
  ahmedm5f90: PAY_PAGE_M5_COMPETITION_BRANDING,
  ahmedm5f98: PAY_PAGE_M5_COMPETITION_BRANDING,
  /** Отдельный визуал только для /pay/ahmedm5f90-1; M5 по логину для этого slug отключается. */
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
