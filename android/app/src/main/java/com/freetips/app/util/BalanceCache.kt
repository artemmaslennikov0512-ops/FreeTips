package com.freetips.app.util

import android.content.Context
import android.content.SharedPreferences

/**
 * Кэш баланса и времени последнего обновления для отображения после фонового обновления.
 */
object BalanceCache {

    private const val PREFS_NAME = "balance_cache"
    private const val KEY_BALANCE_KOP = "balance_kop"
    private const val KEY_FETCH_TIME_MS = "fetch_time_ms"
    private const val MAX_AGE_MS = 15 * 60 * 1000L

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun save(context: Context, balanceKop: Int) {
        prefs(context).edit()
            .putInt(KEY_BALANCE_KOP, balanceKop)
            .putLong(KEY_FETCH_TIME_MS, System.currentTimeMillis())
            .apply()
    }

    /** Возвращает кэшированный баланс (копейки) или null, если кэш пустой или устарел. */
    fun getBalanceKopIfFresh(context: Context): Int? {
        val p = prefs(context)
        val balance = p.getInt(KEY_BALANCE_KOP, -1)
        val time = p.getLong(KEY_FETCH_TIME_MS, 0L)
        if (balance < 0 || time <= 0) return null
        if (System.currentTimeMillis() - time > MAX_AGE_MS) return null
        return balance
    }
}
