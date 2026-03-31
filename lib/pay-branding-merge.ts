import type { PayPageBrandingOverride } from "@/config/pay-branding-overrides";

/**
 * База — тема заведения с GET /api/pay/[slug], поверх — точечные оверрайды по slug из config.
 * В override попадают только поля !== undefined (null для nullable полей сохраняется).
 */
export function mergePayPageBranding(
  base: PayPageBrandingOverride | undefined,
  override: PayPageBrandingOverride | undefined,
): PayPageBrandingOverride | undefined {
  const merged = {
    ...(base ?? {}),
    ...Object.fromEntries(Object.entries(override ?? {}).filter(([, v]) => v !== undefined)),
  } as PayPageBrandingOverride;
  const hasValue = (Object.keys(merged) as (keyof PayPageBrandingOverride)[]).some(
    (k) => merged[k] !== undefined,
  );
  return hasValue ? merged : undefined;
}
