/** Событие для обновления бейджей «Заявки» и «Выводы» в layout после мутаций (заявки, выводы). */
export const ADMIN_REQUESTS_COUNTS_CHANGED = "admin-requests-counts-changed";

export function notifyAdminRequestsCountsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ADMIN_REQUESTS_COUNTS_CHANGED));
}
