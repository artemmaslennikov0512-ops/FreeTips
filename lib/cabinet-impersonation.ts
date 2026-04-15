import { drainImpersonationState, setCabinetImpersonationState, setImpersonationTargetBearer } from "@/lib/cabinet-impersonation-state";

/**
 * Просмотр ЛК целевого пользователя: JWT цели в sessionStorage, путь возврата в localStorage.
 * Сессия админа остаётся в httpOnly-cookie — отдельный бэкап токена админа не нужен.
 */
export function beginCabinetImpersonation(targetAccessToken: string, returnPath: string): void {
  setCabinetImpersonationState(returnPath);
  setImpersonationTargetBearer(targetAccessToken);
}

/** Восстановить UI после просмотра. Возвращает путь для router.replace / location.assign. */
export function endCabinetImpersonation(): string {
  const { returnPath } = drainImpersonationState();
  return returnPath ?? "/admin/dashboard";
}
