/**
 * Состояние «просмотр кабинета» супер-админом: localStorage (как accessToken), без зависимости от auth-client.
 * Раньше использовался sessionStorage — из‑за этого при новой вкладке / потере SS оставался только JWT
 * пользователя, а путь назад в админку терялся.
 */

const FLAG = "lkCabinetImpersonation";
const BACKUP = "lkAdminAccessTokenBackup";
const RETURN = "lkAdminReturnPath";

function clearLegacySessionStorage(): void {
  try {
    sessionStorage.removeItem(FLAG);
    sessionStorage.removeItem(BACKUP);
    sessionStorage.removeItem(RETURN);
  } catch {
    /* ignore */
  }
}

/** Однократно переносит флаг и бэкап из sessionStorage (старые клиенты). */
function migrateFromSessionStorageIfNeeded(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(FLAG) === "1") return;
    if (sessionStorage.getItem(FLAG) !== "1") return;
    const adminToken = sessionStorage.getItem(BACKUP);
    const returnPath = sessionStorage.getItem(RETURN);
    localStorage.setItem(FLAG, "1");
    if (adminToken) localStorage.setItem(BACKUP, adminToken);
    if (returnPath) localStorage.setItem(RETURN, returnPath);
    clearLegacySessionStorage();
  } catch {
    /* ignore */
  }
}

export function isCabinetImpersonating(): boolean {
  if (typeof window === "undefined") return false;
  try {
    migrateFromSessionStorageIfNeeded();
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

export function drainImpersonationState(): { adminToken: string | null; returnPath: string | null } {
  if (typeof window === "undefined") {
    return { adminToken: null, returnPath: null };
  }
  try {
    migrateFromSessionStorageIfNeeded();
    const adminToken = localStorage.getItem(BACKUP);
    const returnPath = localStorage.getItem(RETURN);
    localStorage.removeItem(FLAG);
    localStorage.removeItem(BACKUP);
    localStorage.removeItem(RETURN);
    clearLegacySessionStorage();
    return { adminToken, returnPath };
  } catch {
    return { adminToken: null, returnPath: null };
  }
}

export function setCabinetImpersonationState(adminToken: string, returnPath: string): void {
  if (typeof window === "undefined") return;
  try {
    clearLegacySessionStorage();
    localStorage.setItem(FLAG, "1");
    localStorage.setItem(BACKUP, adminToken);
    localStorage.setItem(RETURN, returnPath);
  } catch {
    /* ignore */
  }
}
