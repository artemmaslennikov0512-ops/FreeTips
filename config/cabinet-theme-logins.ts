/**
 * Персональные темы ЛК по логину (без учёта регистра).
 * Добавляйте логины осознанно — стили в globals.css по data-cabinet-theme.
 */
const CABINET_M5_COMPETITION_LOGINS = new Set(["ahmedm5f90", "ahmedm5f98"]);

export function isCabinetM5CompetitionTheme(login: string | null | undefined): boolean {
  if (!login || typeof login !== "string") return false;
  return CABINET_M5_COMPETITION_LOGINS.has(login.trim().toLowerCase());
}

/** Первое слово — светло-синее, остаток — красный (как на M5-дашборде). */
export function m5SplitDisplayName(displayName: string): { first: string; rest: string | null } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Пользователь", rest: null };
  if (parts.length === 1) return { first: parts[0]!, rest: null };
  return { first: parts[0]!, rest: parts.slice(1).join(" ") };
}
