package com.freetips.app.worker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

/**
 * По срабатыванию будильника ставит в очередь одноразовое обновление баланса.
 * Следующий будильник планируется в BalanceRefreshWorker после выполнения.
 */
class BalanceRefreshReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != "com.freetips.app.BALANCE_REFRESH") return
        val request = OneTimeWorkRequestBuilder<BalanceRefreshWorker>().build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            BalanceRefreshWorker.UNIQUE_WORK_NAME,
            ExistingWorkPolicy.KEEP,
            request,
        )
    }
}
