import { db } from "@/lib/db";
import { loadTipLinkForPaySlug, resolvePayInitForSlug } from "@/lib/pay-slug-resolve";

const MAX_TOKENS = 300;

export function parsePaymentAccountTokens(raw: string): string[] {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_TOKENS);
  return [...new Set(tokens)];
}

/** Токен похож на страницу оплаты: абсолютный URL или путь с сегментом `/pay/`. */
export function tokenLooksLikePayPageUrl(token: string): boolean {
  const t = token.trim();
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(t) || /\/pay\//i.test(t);
}

/** Извлекает код из пути `.../pay/{slug}` (без query и fragment). */
export function extractPaySlugFromToken(token: string): string | null {
  const m = token.trim().match(/\/pay\/([^/?#\s]+)/i);
  const s = m?.[1]?.trim();
  return s || null;
}

/**
 * Сопоставляет токены с user.id: логин/id пользователя и полные ссылки на `/pay/{slug}`
 * (блокируется тот же получатель, что и при создании платежа по этому коду).
 */
export async function resolvePaymentAccountTokensToUserIds(tokens: string[]): Promise<{
  ids: string[];
  unknownTokens: string[];
}> {
  if (tokens.length === 0) return { ids: [], unknownTokens: [] };

  const resolvedIds = new Set<string>();
  const unknownTokens: string[] = [];
  const plainTokens: string[] = [];
  const urlSlugByToken = new Map<string, string>();

  for (const t of tokens) {
    if (tokenLooksLikePayPageUrl(t)) {
      const slug = extractPaySlugFromToken(t);
      if (slug) urlSlugByToken.set(t, slug);
      else plainTokens.push(t);
    } else {
      plainTokens.push(t);
    }
  }

  const uniqueSlugs = [...new Set(urlSlugByToken.values())];
  const slugToRecipientId = new Map<string, string>();
  await Promise.all(
    uniqueSlugs.map(async (slug) => {
      const tipLink = await loadTipLinkForPaySlug(slug);
      if (!tipLink) return;
      const r = await resolvePayInitForSlug(slug, tipLink);
      if ("error" in r) return;
      slugToRecipientId.set(slug, r.paymentRecipientId);
    }),
  );

  for (const t of tokens) {
    const slug = urlSlugByToken.get(t);
    if (slug !== undefined) {
      const rid = slugToRecipientId.get(slug);
      if (rid) resolvedIds.add(rid);
      else unknownTokens.push(t);
    }
  }

  if (plainTokens.length === 0) {
    return { ids: [...resolvedIds], unknownTokens };
  }

  const orClause = plainTokens.flatMap((t) => [
    { id: t },
    { login: { equals: t, mode: "insensitive" as const } },
  ]);

  const users = await db.user.findMany({
    where: { OR: orClause },
    select: { id: true, login: true },
  });

  for (const t of plainTokens) {
    const match = users.find((u) => u.id === t || u.login.toLowerCase() === t.toLowerCase());
    if (match) resolvedIds.add(match.id);
    else unknownTokens.push(t);
  }

  return { ids: [...resolvedIds], unknownTokens };
}
