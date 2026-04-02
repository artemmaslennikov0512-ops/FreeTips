import { db } from "@/lib/db";

const MAX_TOKENS = 300;

export function parsePaymentAccountTokens(raw: string): string[] {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_TOKENS);
  return [...new Set(tokens)];
}

/**
 * Сопоставляет токены (id пользователя или login) с user.id для белого/чёрного списка.
 */
export async function resolvePaymentAccountTokensToUserIds(tokens: string[]): Promise<{
  ids: string[];
  unknownTokens: string[];
}> {
  if (tokens.length === 0) return { ids: [], unknownTokens: [] };

  const orClause = tokens.flatMap((t) => [
    { id: t },
    { login: { equals: t, mode: "insensitive" as const } },
  ]);

  const users = await db.user.findMany({
    where: { OR: orClause },
    select: { id: true, login: true },
  });

  const resolvedIds = new Set<string>();
  const unknownTokens: string[] = [];

  for (const t of tokens) {
    const match = users.find((u) => u.id === t || u.login.toLowerCase() === t.toLowerCase());
    if (match) resolvedIds.add(match.id);
    else unknownTokens.push(t);
  }

  return { ids: [...resolvedIds], unknownTokens };
}
