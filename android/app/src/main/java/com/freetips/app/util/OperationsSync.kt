package com.freetips.app.util

/**
 * Единая полная подгрузка истории операций для UI и синхронизации push по tip-id.
 * Без параметра since — всегда полный срез; неотмеченные транзакции получают пуш при входе в приложение.
 */
object OperationsSync {
    /** Page size for GET /api/operations during push sync. */
    const val FULL_HISTORY_LIMIT = 100
    /** Safety cap to avoid long loops on huge histories. */
    const val MAX_PUSH_SYNC_PAGES = 20
}
