/** Снимок «просмотрено» для главных вкладок «Заявок» (sessionStorage). */
const KEY_V = "admin_requests_main_ack_verification_pending";
const KEY_C = "admin_requests_main_ack_connection_pending";

function readKey(key: string): number | undefined {
  if (typeof window === "undefined") return undefined;
  const s = sessionStorage.getItem(key);
  if (s == null) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function readMainTabAckVerification(): number | undefined {
  return readKey(KEY_V);
}

export function readMainTabAckConnection(): number | undefined {
  return readKey(KEY_C);
}

export function writeMainTabAckVerification(pending: number): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY_V, String(pending));
}

export function writeMainTabAckConnection(pending: number): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY_C, String(pending));
}

/** Сколько показать на бейдже: до первого визита — весь pending; после — только прирост относительно снимка. */
export function mainTabNewPending(currentPending: number, ack: number | undefined): number {
  if (ack === undefined) return currentPending;
  return Math.max(0, currentPending - ack);
}
