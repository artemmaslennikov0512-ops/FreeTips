import { site } from "@/config/site";

/**
 * Slug демо-страницы оплаты (/pay/[slug]).
 * `NEXT_PUBLIC_DEMO_PAY_SLUG=""` — отключить демо.
 * Иначе — значение из env или `site.demoPaySlug` (по умолчанию demo).
 */
export function resolveDemoPaySlug(): string | null {
  const raw = process.env.NEXT_PUBLIC_DEMO_PAY_SLUG;
  if (raw === "") return null;
  const trimmed = raw?.trim();
  if (trimmed) return trimmed;
  return typeof site.demoPaySlug === "string" && site.demoPaySlug ? site.demoPaySlug : "demo";
}
