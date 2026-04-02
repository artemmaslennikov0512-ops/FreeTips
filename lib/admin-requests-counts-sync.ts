/** Событие для обновления бейджа «Заявки» в layout после мутаций на странице заявок. */
export const ADMIN_REQUESTS_COUNTS_CHANGED = "admin-requests-counts-changed";

export function notifyAdminRequestsCountsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ADMIN_REQUESTS_COUNTS_CHANGED));
}
