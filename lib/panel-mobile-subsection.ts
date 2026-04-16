/**
 * Мобильная кнопка «Назад» в шапке панелей — только если URL глубже корня раздела из сайдбара,
 * а не на самой странице раздела (как пункт меню).
 */

function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

export function flattenPanelNavRootHrefs(groups: readonly { items: readonly { href: string }[] }[]): string[] {
  const hrefs: string[] = [];
  for (const g of groups) {
    for (const it of g.items) hrefs.push(it.href);
  }
  return hrefs;
}

/** true, если pathname строго глубже одного из корней навигации (например /admin/users/1 при корне /admin/users). */
export function isPanelMobileSubsectionPath(
  pathname: string | null | undefined,
  navRootHrefs: readonly string[],
): boolean {
  if (!pathname) return false;
  const p = normalizePath(pathname);
  const roots = new Set(navRootHrefs.map(normalizePath));
  if (roots.has(p)) return false;
  for (const raw of navRootHrefs) {
    const r = normalizePath(raw);
    if (p.startsWith(`${r}/`)) return true;
  }
  return false;
}
