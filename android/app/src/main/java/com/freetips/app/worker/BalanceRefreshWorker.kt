package com.freetips.app.worker

import android.content.Context
import android.content.Intent
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.freetips.app.data.ApiClient
import com.freetips.app.data.SecurePrefs
import com.freetips.app.ui.home.parseProfileResponseSafe
import com.freetips.app.util.BalanceCache
import com.freetips.app.util.OperationsPagedSync
import com.freetips.app.util.OperationsSyncCoordinator
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
            val profile = parseProfileResponseSafe(body) ?: run {
                BalanceRefreshScheduler.scheduleNext(applicationContext)
                return@withContext Result.success()
            }
            val stats = profile.stats ?: run {
                BalanceRefreshScheduler.scheduleNext(applicationContext)
                return@withContext Result.success()
            }

            // Полная история (постранично) → пуш по каждому tip-id без отметки.
            runCatching {
                OperationsPagedSync.fetchAndProcess(
                    apiKey = apiKey,
                    baseUrl = prefs.effectiveBaseUrl,
                ) { operations ->
                    OperationsSyncCoordinator.onParsedOperations(applicationContext, operations)
                }
            }
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
        const val UNIQUE_WORK_NAME = "balance_refresh"
    }
}
