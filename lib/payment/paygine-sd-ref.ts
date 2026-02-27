/**
 * Постоянная кубышка официанта (sd_ref).
 * Присваивается при регистрации в ЛК; в Paygine кубышка фактически создаётся при первом зачислении (Relocate).
 */

const PREFIX = "FreeTips_w_";

/** Формирует постоянный sd_ref для официанта по его uniqueId (стабильный, уникальный). */
export function getWaiterPaygineSdRef(uniqueId: number): string {
  return `${PREFIX}${uniqueId}`;
}
