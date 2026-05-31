package com.freetips.app.util

import android.content.Context

/**
 * Единая точка синхронизации операций -> отметки -> push.
 * Внешний код передаёт уже распарсенные операции; сериализация внутри TipNotificationSync.
 */
internal object OperationsSyncCoordinator {

    internal fun onParsedOperations(context: Context, operations: List<ParsedOperation>) {
        if (operations.isEmpty()) return
        TipNotificationSync.syncFromParsedOperations(context.applicationContext, operations)
    }
}
