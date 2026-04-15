/** Роль для пунктов сайдбара ЛК с recipientOnly/employeeOnly до ответа /api/profile (без «мигания» при F5). */
const CABINET_NAV_ROLE_CACHE_KEY = "freetipsCabinetNavRole";

export function readCabinetNavRoleCache(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(CABINET_NAV_ROLE_CACHE_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function writeCabinetNavRoleCache(role: string | undefined | null) {
  if (typeof window === "undefined" || !role) return;
  try {
    sessionStorage.setItem(CABINET_NAV_ROLE_CACHE_KEY, role);
  } catch {
    /* ignore */
  }
}

export function clearCabinetNavRoleCache() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CABINET_NAV_ROLE_CACHE_KEY);
  } catch {
    /* ignore */
  }
}
