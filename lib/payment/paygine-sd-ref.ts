/**
 * Постоянная кубышка официанта (sd_ref).
 * Присваивается при регистрации в ЛК; в Paygine кубышка фактически создаётся при первом зачислении (Relocate).
 * Используется userId (cuid), чтобы sd_ref был глобально уникальным и не пересекался с кубышками других/удалённых пользователей.
 */

const PREFIX = "FreeTips_w_";

/** Формирует постоянный sd_ref для официанта по его id (cuid) — уникальный, не порядковый. */
export function getWaiterPaygineSdRef(userId: string): string {
  return `${PREFIX}${userId}`;
}
