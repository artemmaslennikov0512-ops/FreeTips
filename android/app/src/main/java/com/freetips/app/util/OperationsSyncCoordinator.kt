package com.freetips.app.util

import android.content.Context
import java.util.concurrent.Executors

/**
 * Единая точка синхронизации операций -> отметки -> push.
 * Выполняется в single-thread executor, чтобы не блокировать UI-поток сетевыми claim-запросами.
 */
internal object OperationsSyncCoordinator {
    private val executor = Executors.newSingleThreadExecutor { r ->
        Thread(r, "operations-sync").apply { isDaemon = true }
    }

    internal fun onParsedOperations(context: Context, operations: List<ParsedOperation>) {
        if (operations.isEmpty()) return
        val appCtx = context.applicationContext
        val snapshot = operations.toList()
        executor.execute {
            TipNotificationSync.syncFromParsedOperations(appCtx, snapshot)
        }
    }
}
