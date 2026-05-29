package com.freetips.app.ui.transactions

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
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.freetips.app.R
import com.freetips.app.data.ApiClient
import com.freetips.app.data.SecurePrefs
import com.freetips.app.databinding.FragmentTransactionsBinding
import com.freetips.app.databinding.ItemTransactionBinding
import com.freetips.app.ui.home.ProfileResponse
import com.freetips.app.util.BalanceCache
import com.freetips.app.util.MoscowDateTime
import com.freetips.app.util.formatKopToRub
import com.freetips.app.worker.BalanceRefreshWorker
import com.google.gson.Gson
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Response
import java.io.IOException

data class OperationsResponse(val operations: List<OperationItem>, val total: Int)
data class OperationItem(val id: String, val type: String, val amountKop: Int, val status: String, val createdAt: String)

private fun statusKind(op: OperationItem): String {
    if (op.type == "tip") {
        if (op.status == "SUCCESS") return "success"
        if (op.status == "PENDING") return "pending"
        return "failed"
    }
    if (op.status == "COMPLETED") return "success"
    if (op.status == "CREATED" || op.status == "PROCESSING") return "pending"
    return "failed"
}

private fun typeLabel(op: OperationItem): String =
    if (op.type == "tip") "Пополнение" else "Списание"

class TransactionsFragment : Fragment() {

    /** Автообновление раз в минуту (swipe и смена вкладки по-прежнему обновляют сразу). */
    private val refreshIntervalMs = 60_000L
    private val handler = Handler(Looper.getMainLooper())
    private var refreshRunnable: Runnable? = null
    private var rateLimitRetryRunnable: Runnable? = null
    private var balanceUpdatedReceiver: BroadcastReceiver? = null

    private var _binding: FragmentTransactionsBinding? = null
    private val binding get() = _binding!!

    private var allOperations: List<OperationItem> = emptyList()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentTransactionsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.recycler.layoutManager = LinearLayoutManager(requireContext())
        binding.swipeRefresh.setColorSchemeResources(R.color.primary)
        binding.swipeRefresh.setOnRefreshListener { load(silent = false) }
        binding.filterApply.setOnClickListener { applyFilter() }
        load(silent = false)
    }

    override fun onResume() {
        super.onResume()
        registerBalanceUpdatedReceiver()
        load(silent = true)
        startPeriodicRefresh()
    }

    override fun onPause() {
        unregisterBalanceUpdatedReceiver()
        stopPeriodicRefresh()
        cancelRateLimitRetry()
        super.onPause()
    }

    private fun registerBalanceUpdatedReceiver() {
        if (balanceUpdatedReceiver != null) return
        balanceUpdatedReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action == BalanceRefreshWorker.ACTION_BALANCE_UPDATED) {
                    load(silent = true)
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
                if (_binding != null) load(silent = true)
                refreshRunnable?.let { handler.postDelayed(it, refreshIntervalMs) }
            }
        }
        handler.postDelayed(refreshRunnable!!, refreshIntervalMs)
    }

    private fun stopPeriodicRefresh() {
        refreshRunnable?.let { handler.removeCallbacks(it) }
        refreshRunnable = null
    }

    private fun cancelRateLimitRetry() {
        rateLimitRetryRunnable?.let { handler.removeCallbacks(it) }
        rateLimitRetryRunnable = null
    }

    /** После 429 тихое обновление не показывает ошибку — один повтор через паузу, чтобы подтянуть историю/баланс. */
    private fun scheduleSilentRetryAfterRateLimit() {
        if (rateLimitRetryRunnable != null) return
        rateLimitRetryRunnable = Runnable {
            rateLimitRetryRunnable = null
            if (_binding != null) load(silent = true)
        }
        handler.postDelayed(rateLimitRetryRunnable!!, 12_000L)
    }

    private fun parseRubToKop(input: String): Long? {
        val s = input.trim().replace(",", ".")
        if (s.isEmpty()) return null
        return try {
            (s.toDoubleOrNull() ?: return null).let { rub ->
                if (rub < 0) return null
                (rub * 100).toLong().coerceAtLeast(0)
            }
        } catch (_: Exception) { null }
    }

    private fun applyFilter() {
        val b = _binding ?: return
        val fromKop = parseRubToKop(binding.filterAmountFrom.text?.toString() ?: "") ?: 0L
        val toKop = parseRubToKop(binding.filterAmountTo.text?.toString() ?: "") ?: Long.MAX_VALUE
        val filtered = if (fromKop == 0L && toKop == Long.MAX_VALUE) {
            allOperations
        } else {
            allOperations.filter { it.amountKop in fromKop..toKop }
        }
        b.recycler.adapter = OpAdapter(filtered)
    }

    private fun load(silent: Boolean = false) {
        val b = _binding ?: return
        val ctx = context ?: return
        val prefs = SecurePrefs(ctx)
        val apiKey = prefs.apiKey ?: run {
            b.swipeRefresh.isRefreshing = false
            return
        }
        val baseUrl = prefs.effectiveBaseUrl
        if (!silent) {
            if (!b.swipeRefresh.isRefreshing) b.progress.visibility = View.VISIBLE
            b.errorText.visibility = View.GONE
        }

        ApiClient(apiKey, baseUrl).getProfile().enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { /* optional */ }
            override fun onResponse(call: Call, response: Response) {
                if (silent && response.code == 429) scheduleSilentRetryAfterRateLimit()
                if (!response.isSuccessful) return
                val body = response.body?.string() ?: return
                activity?.runOnUiThread {
                    val ui = _binding ?: return@runOnUiThread
                    try {
                        val profile = Gson().fromJson(body, ProfileResponse::class.java)
                        profile.stats?.let { s ->
                            ui.virtualCardInclude.cardBalance.text = formatKopToRub(s.balanceKop)
                            BalanceCache.save(ui.root.context.applicationContext, s.balanceKop)
                            com.freetips.app.util.BalanceNotificationHelper.showIfNeeded(
                                ui.root.context.applicationContext,
                                s.balanceKop,
                                s.totalGuestPaidTipsKop,
                            )
                        }
                    } catch (_: Exception) {}
                }
            }
        })

        ApiClient(apiKey, baseUrl).getOperations(50, 0).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread {
                    val ui = _binding ?: return@runOnUiThread
                    if (!silent) {
                        ui.progress.visibility = View.GONE
                        ui.swipeRefresh.isRefreshing = false
                        ui.errorText.visibility = View.VISIBLE
                        ui.errorText.text = "Ошибка загрузки"
                    }
                }
            }
            override fun onResponse(call: Call, response: Response) {
                activity?.runOnUiThread {
                    val ui = _binding ?: return@runOnUiThread
                    if (!silent) {
                        ui.progress.visibility = View.GONE
                        ui.swipeRefresh.isRefreshing = false
                    }
                    if (response.isSuccessful) {
                        val body = response.body?.string() ?: ""
                        try {
                            val data = Gson().fromJson(body, OperationsResponse::class.java)
                            allOperations = data.operations
                            applyFilter()
                        } catch (_: Exception) {}
                    } else {
                        if (!silent) {
                            ui.errorText.visibility = View.VISIBLE
                            ui.errorText.text = "Ошибка ${response.code}"
                        }
                        if (silent && response.code == 429) {
                            scheduleSilentRetryAfterRateLimit()
                        }
                    }
                }
            }
        })
    }

    override fun onDestroyView() {
        cancelRateLimitRetry()
        _binding = null
        super.onDestroyView()
    }
}

class OpAdapter(private val items: List<OperationItem>) : RecyclerView.Adapter<OpAdapter.VH>() {
    class VH(val binding: ItemTransactionBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(ItemTransactionBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val op = items[position]
        val rub = op.amountKop / 100.0
        val displayRub = if (op.type == "payout") -rub else rub
        holder.binding.amount.text = com.freetips.app.util.formatRub(displayRub, signed = true)
        holder.binding.typeLabel.text = typeLabel(op)
        holder.binding.date.text = MoscowDateTime.formatOperationCreatedAt(op.createdAt)
        val iconRes = when (statusKind(op)) {
            "success" -> R.drawable.ic_status_success
            "pending" -> R.drawable.ic_status_pending
            else -> R.drawable.ic_status_failed
        }
        holder.binding.statusIcon.setImageResource(iconRes)
    }

    override fun getItemCount(): Int = items.size
}
