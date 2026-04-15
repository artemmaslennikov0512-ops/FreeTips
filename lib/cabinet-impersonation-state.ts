/**
 * Просмотр ЛК другим пользователем (супер-админ / управляющий): флаг и путь возврата в localStorage,
 * JWT цели — только в sessionStorage вкладки (не httpOnly cookie админа не трогаем).
 */

const FLAG = "lkCabinetImpersonation";
const RETURN = "lkAdminReturnPath";
/** JWT сотрудника для Authorization; очищается при выходе из режима просмотра. */
export const IMPERSONATION_TARGET_BEARER_KEY = "lkImpersonationTargetBearer";

const LEGACY_BACKUP = "lkAdminAccessTokenBackup";

function clearLegacySessionStorage(): void {
  try {
    sessionStorage.removeItem(FLAG);
    sessionStorage.removeItem(LEGACY_BACKUP);
    sessionStorage.removeItem(RETURN);
    sessionStorage.removeItem(IMPERSONATION_TARGET_BEARER_KEY);
  } catch {
    /* ignore */
  }
}

/** Однократно переносит флаг из sessionStorage (старые клиенты). */
function migrateFromSessionStorageIfNeeded(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(FLAG) === "1") return;
    if (sessionStorage.getItem(FLAG) !== "1") return;
    const returnPath = sessionStorage.getItem(RETURN);
    localStorage.setItem(FLAG, "1");
    if (returnPath) localStorage.setItem(RETURN, returnPath);
    clearLegacySessionStorage();
  } catch {
    /* ignore */
  }
}

/** Удаляет устаревший бэкап JWT админа в localStorage (раньше хранился рядом с токеном цели). */
function clearLegacyAdminBackupInLocalStorage(): void {
  try {
    localStorage.removeItem(LEGACY_BACKUP);
  } catch {
    /* ignore */
  }
}

export function isCabinetImpersonating(): boolean {
  if (typeof window === "undefined") return false;
  try {
    migrateFromSessionStorageIfNeeded();
    clearLegacyAdminBackupInLocalStorage();
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

export function drainImpersonationState(): { returnPath: string | null } {
  if (typeof window === "undefined") {
    return { returnPath: null };
  }
  try {
    migrateFromSessionStorageIfNeeded();
    const returnPath = localStorage.getItem(RETURN);
    localStorage.removeItem(FLAG);
    localStorage.removeItem(RETURN);
    clearLegacyAdminBackupInLocalStorage();
    sessionStorage.removeItem(IMPERSONATION_TARGET_BEARER_KEY);
    clearLegacySessionStorage();
    return { returnPath };
  } catch {
    return { returnPath: null };
  }
}

export function setCabinetImpersonationState(returnPath: string): void {
  if (typeof window === "undefined") return;
  try {
    clearLegacySessionStorage();
    localStorage.setItem(FLAG, "1");
    localStorage.setItem(RETURN, returnPath);
  } catch {
    /* ignore */
  }
}

export function setImpersonationTargetBearer(token: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(IMPERSONATION_TARGET_BEARER_KEY, token);
  } catch {
    /* ignore */
  }
}

export function getImpersonationTargetBearer(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(IMPERSONATION_TARGET_BEARER_KEY);
  } catch {
    return null;
  }
}
