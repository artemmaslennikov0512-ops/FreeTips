package com.freetips.app.util

import android.content.Context

/**
 * Локальные счётчики sync-пайплайна push для отладки стабильности.
 * Хранятся в SharedPreferences и не отправляются наружу.
 */
internal object PushSyncMetrics {
    private const val PREFS_NAME = "push_sync_metrics"
    private const val KEY_FETCHED = "fetched"
    private const val KEY_PENDING_CREATED = "pending_created"
    private const val KEY_DELIVERED = "delivered"
    private const val KEY_RETRY_FROM_PENDING = "retry_from_pending"
    private const val KEY_SKIPPED_DELIVERED = "skipped_delivered"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun addFetched(context: Context, count: Int) {
        if (count <= 0) return
        val p = prefs(context)
        p.edit().putLong(KEY_FETCHED, p.getLong(KEY_FETCHED, 0L) + count).apply()
    }

    fun incPendingCreated(context: Context) = inc(context, KEY_PENDING_CREATED)
    fun incDelivered(context: Context) = inc(context, KEY_DELIVERED)
    fun incRetryFromPending(context: Context) = inc(context, KEY_RETRY_FROM_PENDING)
    fun incSkippedDelivered(context: Context) = inc(context, KEY_SKIPPED_DELIVERED)

    private fun inc(context: Context, key: String) {
        val p = prefs(context)
        p.edit().putLong(key, p.getLong(key, 0L) + 1L).apply()
    }
}
