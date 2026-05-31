package com.freetips.app.ui.home

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.freetips.app.R
import com.freetips.app.data.ApiClient
import com.freetips.app.worker.BalanceRefreshWorker
import com.freetips.app.data.SecurePrefs
import com.freetips.app.databinding.FragmentHomeBinding
import com.freetips.app.util.BalanceCache
import com.freetips.app.util.OperationsSyncCoordinator
import com.freetips.app.util.OperationsPagedSync
import com.freetips.app.util.PollJitter
import com.freetips.app.util.formatKopToRub
import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Response
import java.io.IOException

data class ProfileResponse(
    val stats: Stats?,
    val fullName: String?,
    val login: String?,
    val payoutLimits: PayoutLimits?,
    val payoutUsageToday: PayoutUsage?,
    val payoutUsageMonth: PayoutUsage?
)

data class Stats(
    val balanceKop: Int,
    val totalReceivedKop: Int,
    val transactionsCount: Int,
    val payoutsPendingCount: Int
)

data class PayoutLimits(
    val dailyLimitCount: Int,
    val dailyLimitKop: Long,
    val monthlyLimitCount: Int?,
    val monthlyLimitKop: Long?
)

data class PayoutUsage(
    val count: Int,
    val sumKop: Long
)

private fun Long.saturatedToInt(): Int = when {
    this > Int.MAX_VALUE.toLong() -> Int.MAX_VALUE
    this < Int.MIN_VALUE.toLong() -> Int.MIN_VALUE
    else -> this.toInt()
}

private fun JsonElement?.asLongSafe(): Long? {
    if (this == null || !this.isJsonPrimitive) return null
    val p = this.asJsonPrimitive
    return when {
        p.isNumber -> p.asBigDecimal.toLong()
        p.isString -> p.asString.trim().toLongOrNull()
        else -> null
    }
}

private fun JsonElement?.asStringSafe(): String? {
    if (this == null || !this.isJsonPrimitive) return null
    return this.asString
}

fun parseProfileResponseSafe(json: String): ProfileResponse? {
    val root = runCatching { Gson().fromJson(json, JsonObject::class.java) }.getOrNull() ?: return null
    val statsObj = root.getAsJsonObject("stats")
    val stats = if (statsObj != null) {
        Stats(
            balanceKop = (statsObj.get("balanceKop").asLongSafe() ?: 0L).saturatedToInt(),
            totalReceivedKop = (statsObj.get("totalReceivedKop").asLongSafe() ?: 0L).saturatedToInt(),
            transactionsCount = (statsObj.get("transactionsCount").asLongSafe() ?: 0L).saturatedToInt(),
            payoutsPendingCount = (statsObj.get("payoutsPendingCount").asLongSafe() ?: 0L).saturatedToInt(),
        )
    } else {
        null
    }

    val limitsObj = root.getAsJsonObject("payoutLimits")
    val limits = if (limitsObj != null) {
        PayoutLimits(
            dailyLimitCount = (limitsObj.get("dailyLimitCount").asLongSafe() ?: 0L).saturatedToInt(),
            dailyLimitKop = limitsObj.get("dailyLimitKop").asLongSafe() ?: 0L,
            monthlyLimitCount = limitsObj.get("monthlyLimitCount").asLongSafe()?.saturatedToInt(),
            monthlyLimitKop = limitsObj.get("monthlyLimitKop").asLongSafe(),
        )
    } else {
        null
    }

    val usageTodayObj = root.getAsJsonObject("payoutUsageToday")
    val usageToday = if (usageTodayObj != null) {
        PayoutUsage(
            count = (usageTodayObj.get("count").asLongSafe() ?: 0L).saturatedToInt(),
            sumKop = usageTodayObj.get("sumKop").asLongSafe() ?: 0L,
        )
    } else {
        null
    }

    val usageMonthObj = root.getAsJsonObject("payoutUsageMonth")
    val usageMonth = if (usageMonthObj != null) {
        PayoutUsage(
            count = (usageMonthObj.get("count").asLongSafe() ?: 0L).saturatedToInt(),
            sumKop = usageMonthObj.get("sumKop").asLongSafe() ?: 0L,
        )
    } else {
        null
    }

    return ProfileResponse(
        stats = stats,
        fullName = root.get("fullName").asStringSafe(),
        login = root.get("login").asStringSafe(),
        payoutLimits = limits,
        payoutUsageToday = usageToday,
        payoutUsageMonth = usageMonth,
    )
}

class HomeFragment : Fragment() {

    /** Автообновление баланса раз в 60 секунд (swipe и возврат на вкладку — сразу). */
    private val refreshIntervalMs = 60_000L
    private val handler = Handler(Looper.getMainLooper())
    private var refreshRunnable: Runnable? = null
    private var balanceUpdatedReceiver: BroadcastReceiver? = null

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.swipeRefresh.setColorSchemeResources(R.color.primary)
        binding.swipeRefresh.setOnRefreshListener { loadProfile(silent = false) }
    }

    override fun onResume() {
        super.onResume()
        registerBalanceUpdatedReceiver()
        try {
            applyCachedBalanceIfFresh()
            loadProfile(silent = false)
            startPeriodicRefresh()
        } catch (t: Throwable) {
            _binding?.errorText?.let {
                it.visibility = View.VISIBLE
                it.text = "Ошибка: ${t.message}"
            }
        }
    }

    override fun onPause() {
        unregisterBalanceUpdatedReceiver()
        stopPeriodicRefresh()
        super.onPause()
    }

    private fun registerBalanceUpdatedReceiver() {
        if (balanceUpdatedReceiver != null) return
        balanceUpdatedReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action == BalanceRefreshWorker.ACTION_BALANCE_UPDATED) {
                    // Worker уже синхронизировал пуши — только обновляем баланс на экране.
                    loadProfile(silent = true, syncNotifications = false)
                }
            }
        }
        val filter = IntentFilter(BalanceRefreshWorker.ACTION_BALANCE_UPDATED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context?.registerReceiver(balanceUpdatedReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            context?.registerReceiver(balanceUpdatedReceiver, filter)
        }
    }

    private fun unregisterBalanceUpdatedReceiver() {
        balanceUpdatedReceiver?.let {
            try { context?.unregisterReceiver(it) } catch (_: Exception) {}
            balanceUpdatedReceiver = null
        }
    }

    private fun startPeriodicRefresh() {
        stopPeriodicRefresh()
        refreshRunnable = object : Runnable {
            override fun run() {
                if (_binding != null) loadProfile(silent = true)
                refreshRunnable?.let { handler.postDelayed(it, PollJitter.withJitter(refreshIntervalMs)) }
            }
        }
        handler.postDelayed(refreshRunnable!!, PollJitter.withJitter(refreshIntervalMs))
    }

    private fun stopPeriodicRefresh() {
        refreshRunnable?.let { handler.removeCallbacks(it) }
        refreshRunnable = null
    }

    private fun applyCachedBalanceIfFresh() {
        BalanceCache.getBalanceKopIfFresh(requireContext())?.let { kop ->
            _binding?.virtualCardInclude?.cardBalance?.text = formatKopToRub(kop)
        }
    }

    private fun loadProfile(silent: Boolean = false, syncNotifications: Boolean = true) {
        val b = _binding ?: return
        val ctx = context ?: return
        val prefs = SecurePrefs(ctx)
        val apiKey = prefs.apiKey ?: run {
            if (!silent) b.swipeRefresh.isRefreshing = false
            return
        }
        if (!silent && !b.swipeRefresh.isRefreshing) b.progress.visibility = View.VISIBLE
        if (!silent) b.errorText.visibility = View.GONE

        ApiClient(apiKey, prefs.effectiveBaseUrl).getProfile().enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread {
                    _binding?.let { b ->
                        if (!silent) {
                            b.progress.visibility = View.GONE
                            b.swipeRefresh.isRefreshing = false
                            b.errorText.visibility = View.VISIBLE
                            b.errorText.text = "Ошибка загрузки"
                        }
                    }
                }
            }

            override fun onResponse(call: Call, response: Response) {
                val body = response.body?.string() ?: ""
                val code = response.code
                val ok = response.isSuccessful
                activity?.runOnUiThread {
                    _binding?.let { b ->
                        if (!silent) {
                            b.progress.visibility = View.GONE
                            b.swipeRefresh.isRefreshing = false
                        }
                        if (ok) {
                            try {
                                val profile = parseProfileResponseSafe(body) ?: return@let
                                val s = profile.stats
                                if (s != null) {
                                    b.virtualCardInclude.cardBalance.text = formatKopToRub(s.balanceKop)
                                    BalanceCache.save(b.root.context.applicationContext, s.balanceKop)
                                }
                                bindLimits(b, profile.payoutLimits, profile.payoutUsageToday, profile.payoutUsageMonth)
                            } catch (_: Throwable) {}
                        } else if (!silent) {
                            b.errorText.visibility = View.VISIBLE
                            b.errorText.text = "Ошибка $code"
                        }
                    }
                }
            }
        })

        if (!syncNotifications) return

        syncPushNotificationsPaged(apiKey, prefs.effectiveBaseUrl)
    }

    private fun syncPushNotificationsPaged(apiKey: String, baseUrl: String) {
        val appCtx = context?.applicationContext ?: return
        Thread {
            try {
                OperationsPagedSync.fetchAndProcess(
                    apiKey = apiKey,
                    baseUrl = baseUrl,
                ) { operations ->
                    activity?.runOnUiThread {
                        OperationsSyncCoordinator.onParsedOperations(appCtx, operations)
                    }
                }
            } catch (_: Exception) {
                // Тихий фоновый sync уведомлений: отсутствие сети не блокирует экран.
            }
        }.start()
    }

    private fun bindLimits(
        b: FragmentHomeBinding,
        limits: PayoutLimits?,
        usageToday: PayoutUsage?,
        usageMonth: PayoutUsage?
    ) {
        if (limits == null) {
            b.limitsCard.visibility = View.GONE
            return
        }
        b.limitsCard.visibility = View.VISIBLE
        val todayCount = usageToday?.count ?: 0
        val todaySum = usageToday?.sumKop ?: 0L
        val dailyCountLimit = limits.dailyLimitCount.coerceAtLeast(1)
        val dailySumLimit = limits.dailyLimitKop.coerceAtLeast(1L)
        b.limitsDailyCountText.text = getString(R.string.limits_daily_count_fmt, todayCount, limits.dailyLimitCount)
        b.limitsDailyCountProgress.setMax(100)
        b.limitsDailyCountProgress.setProgress((todayCount * 100 / dailyCountLimit).coerceIn(0, 100))
        b.limitsDailySumText.text = getString(R.string.limits_daily_sum_fmt, formatKopToRub(todaySum), formatKopToRub(limits.dailyLimitKop))
        b.limitsDailySumProgress.setMax(100)
        b.limitsDailySumProgress.setProgress((todaySum * 100 / dailySumLimit).toInt().coerceIn(0, 100))
        val monthlyCount = limits.monthlyLimitCount
        val monthlyKop = limits.monthlyLimitKop
        if (monthlyCount != null && monthlyKop != null) {
            b.limitsMonthlyBlock.visibility = View.VISIBLE
            val monthCount = usageMonth?.count ?: 0
            val monthSum = usageMonth?.sumKop ?: 0L
            b.limitsMonthlyCountText.text = getString(R.string.limits_monthly_count_fmt, monthCount, monthlyCount)
            b.limitsMonthlyCountProgress.setMax(100)
            b.limitsMonthlyCountProgress.setProgress(((monthCount * 100) / monthlyCount.coerceAtLeast(1)).coerceIn(0, 100))
            b.limitsMonthlySumText.text = getString(R.string.limits_monthly_sum_fmt, formatKopToRub(monthSum), formatKopToRub(monthlyKop))
            b.limitsMonthlySumProgress.setMax(100)
            b.limitsMonthlySumProgress.setProgress(((monthSum * 100) / monthlyKop.coerceAtLeast(1L)).toInt().coerceIn(0, 100))
        } else {
            b.limitsMonthlyBlock.visibility = View.GONE
        }
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}
