package com.freetips.app.worker

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock

/**
 * Планирует фоновое обновление баланса раз в минуту через AlarmManager
 * (WorkManager не позволяет периодичность чаще 15 минут).
 */
object BalanceRefreshScheduler {

    private const val INTERVAL_MS = 60_000L
    private const val ACTION_REFRESH = "com.freetips.app.BALANCE_REFRESH"

    fun scheduleNext(context: Context) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(context, BalanceRefreshReceiver::class.java).apply { action = ACTION_REFRESH }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val pending = PendingIntent.getBroadcast(context, 0, intent, flags)
        val triggerAt = SystemClock.elapsedRealtime() + INTERVAL_MS
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pending)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pending)
        } else {
            am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pending)
        }
    }

    fun cancel(context: Context) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(context, BalanceRefreshReceiver::class.java).apply { action = ACTION_REFRESH }
        val pending = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        am.cancel(pending)
    }
}
