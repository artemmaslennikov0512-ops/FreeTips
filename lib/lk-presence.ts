/**
 * Присутствие в ЛК (для админки «В ЛК»): lastSeenAt + окно activeInLk.
 * Не путать с JWT-сессией: выход из ЛК только по «Выйти», access/refresh живут сутки/неделю.
 *
 * Модель: одна запись lastSeenAt на весь интервал окна — пока с последней записи прошло
 * меньше этого времени, повторные запросы (JWT, heartbeat) в БД не пишут.
 * Дольше окна без активности → в админке «не в ЛК»; следующий запрос снова пишет метку.
 */

/** И окно «сейчас в ЛК», и минимальный зазор между записями lastSeenAt — одно число. */
export const LK_PRESENCE_WINDOW_MS = 5 * 60 * 1000;

export const LK_LAST_SEEN_TOUCH_MIN_INTERVAL_MS = LK_PRESENCE_WINDOW_MS;

export function isActiveInLk(lastSeenAt: Date | null, now: Date = new Date()): boolean {
  if (!lastSeenAt) return false;
  return lastSeenAt.getTime() > now.getTime() - LK_PRESENCE_WINDOW_MS;
}
