/**
 * Персональные темы ЛК по логину (без учёта регистра).
 * Добавляйте логины осознанно — стили в globals.css по data-cabinet-theme.
 */
const CABINET_M5_COMPETITION_LOGINS = new Set(["ahmedm5f90"]);

export function isCabinetM5CompetitionTheme(login: string | null | undefined): boolean {
  if (!login || typeof login !== "string") return false;
  return CABINET_M5_COMPETITION_LOGINS.has(login.trim().toLowerCase());
}
