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
import com.freetips.app.util.BalanceNotificationHelper
import com.freetips.app.util.formatKopToRub
import com.google.gson.Gson
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

class HomeFragment : Fragment() {

    private val refreshIntervalMs = 5_000L
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
                    loadProfile(silent = true)
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
                refreshRunnable?.let { handler.postDelayed(it, refreshIntervalMs) }
            }
        }
        handler.postDelayed(refreshRunnable!!, refreshIntervalMs)
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

    private fun loadProfile(silent: Boolean = false) {
        val prefs = SecurePrefs(requireContext())
        val apiKey = prefs.apiKey ?: run {
            if (!silent) binding.swipeRefresh.isRefreshing = false
            return
        }
        if (!silent && !binding.swipeRefresh.isRefreshing) binding.progress.visibility = View.VISIBLE
        if (!silent) binding.errorText.visibility = View.GONE

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
                                val profile = Gson().fromJson(body, ProfileResponse::class.java)
                                val s = profile.stats
                                if (s != null) {
                                    b.virtualCardInclude.cardBalance.text = formatKopToRub(s.balanceKop)
                                    BalanceCache.save(b.root.context.applicationContext, s.balanceKop)
                                    BalanceNotificationHelper.showIfNeeded(
                                        b.root.context.applicationContext,
                                        s.balanceKop,
                                        s.totalReceivedKop
                                    )
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
