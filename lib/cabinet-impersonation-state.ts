/**
 * Состояние «просмотр кабинета» супер-админом: только sessionStorage, без зависимости от auth-client.
 */

const SS_FLAG = "lkCabinetImpersonation";
const SS_BACKUP = "lkAdminAccessTokenBackup";
const SS_RETURN = "lkAdminReturnPath";

export function isCabinetImpersonating(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SS_FLAG) === "1";
  } catch {
    return false;
  }
}

export function drainImpersonationState(): { adminToken: string | null; returnPath: string | null } {
  if (typeof window === "undefined") {
    return { adminToken: null, returnPath: null };
  }
  try {
    const adminToken = sessionStorage.getItem(SS_BACKUP);
    const returnPath = sessionStorage.getItem(SS_RETURN);
    sessionStorage.removeItem(SS_FLAG);
    sessionStorage.removeItem(SS_BACKUP);
    sessionStorage.removeItem(SS_RETURN);
    return { adminToken, returnPath };
  } catch {
    return { adminToken: null, returnPath: null };
  }
}

export function setCabinetImpersonationState(adminToken: string, returnPath: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SS_FLAG, "1");
    sessionStorage.setItem(SS_BACKUP, adminToken);
    sessionStorage.setItem(SS_RETURN, returnPath);
  } catch {
    /* ignore */
  }
}
