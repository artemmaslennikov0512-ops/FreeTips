/**
 * Тайминги relocate (перелив с кубышки заказа на официанта) — одна точка правды для шлюза и мониторинга.
 */

/** После этого времени runRelocateForTransaction сбрасывает relocateStartedAt, чтобы другой воркер мог подхватить перелив. */
export const RELOCATE_CLAIM_STALE_MS = 15 * 60 * 1000;

/**
 * Порог для алёртов: claim relocate старше этого — нужна проверка (перелив завис / нет вызовов sync-webhook).
 * Чуть больше RELOCATE_CLAIM_STALE_MS, чтобы не шуметь, пока сработает штатный сброс при следующем runRelocate.
 */
export const RELOCATE_CLAIM_ALERT_AFTER_MS = RELOCATE_CLAIM_STALE_MS + 5 * 60 * 1000;
