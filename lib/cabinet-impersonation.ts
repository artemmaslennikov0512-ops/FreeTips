import { setAccessToken } from "@/lib/auth-client";
import { drainImpersonationState, setCabinetImpersonationState } from "@/lib/cabinet-impersonation-state";

/**
 * Супер-админ: войти в ЛК получателя/официанта. Токен админа сохраняется в sessionStorage.
 */
export function beginCabinetImpersonation(adminAccessToken: string, targetAccessToken: string, returnPath: string): void {
  setCabinetImpersonationState(adminAccessToken, returnPath);
  setAccessToken(targetAccessToken);
}

/** Восстановить токен админа и очистить флаги. Возвращает путь для router.push / location.assign. */
export function endCabinetImpersonation(): string {
  const { adminToken, returnPath } = drainImpersonationState();
  if (adminToken) setAccessToken(adminToken);
  return returnPath ?? "/admin/dashboard";
}
