package com.freetips.app.worker

import android.content.Context
import android.content.Intent
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.freetips.app.data.ApiClient
import com.freetips.app.data.SecurePrefs
import com.freetips.app.ui.home.ProfileResponse
import com.freetips.app.util.BalanceCache
import com.freetips.app.util.BalanceNotificationHelper
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException

/**
 * Периодически запрашивает профиль в фоне и обновляет кэш баланса и список уведомлений о пополнении.
 */
class BalanceRefreshWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val prefs = SecurePrefs(applicationContext)
        val apiKey = prefs.apiKey ?: run {
            BalanceRefreshScheduler.scheduleNext(applicationContext)
            return@withContext Result.success()
        }
        if (apiKey.isBlank()) {
            BalanceRefreshScheduler.scheduleNext(applicationContext)
            return@withContext Result.success()
        }

        val call = ApiClient(apiKey, prefs.effectiveBaseUrl).getProfile()
        try {
            val response = call.execute()
            val body = response.body?.string() ?: run {
                BalanceRefreshScheduler.scheduleNext(applicationContext)
                return@withContext Result.retry()
            }
            if (!response.isSuccessful) {
                BalanceRefreshScheduler.scheduleNext(applicationContext)
                return@withContext Result.success()
            }
            val profile = Gson().fromJson(body, ProfileResponse::class.java)
            val stats = profile.stats ?: run {
                BalanceRefreshScheduler.scheduleNext(applicationContext)
                return@withContext Result.success()
            }

            BalanceNotificationHelper.showIfNeeded(
                applicationContext,
                stats.balanceKop,
                stats.totalReceivedKop
            )
            BalanceCache.save(applicationContext, stats.balanceKop)
            applicationContext.sendBroadcast(Intent(ACTION_BALANCE_UPDATED).setPackage(applicationContext.packageName))
            BalanceRefreshScheduler.scheduleNext(applicationContext)
            return@withContext Result.success()
        } catch (e: IOException) {
            BalanceRefreshScheduler.scheduleNext(applicationContext)
            return@withContext Result.retry()
        } catch (e: Exception) {
            BalanceRefreshScheduler.scheduleNext(applicationContext)
            return@withContext Result.success()
        }
    }

    companion object {
        const val ACTION_BALANCE_UPDATED = "com.freetips.app.BALANCE_UPDATED"
    }
}
