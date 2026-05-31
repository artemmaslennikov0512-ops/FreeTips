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
import com.freetips.app.ui.home.parseProfileResponseSafe
import com.freetips.app.util.BalanceCache
import com.freetips.app.util.MoscowDateTime
import com.freetips.app.util.OperationsJsonParser
import com.freetips.app.util.OperationsSync
import com.freetips.app.util.OperationsSyncCoordinator
import com.freetips.app.util.ParsedOperation
import com.freetips.app.util.PollJitter
import com.freetips.app.util.formatKopToRub
import com.freetips.app.worker.BalanceRefreshWorker
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Response
import java.io.IOException

private fun statusKind(op: ParsedOperation): String {
    if (op.type == "tip") {
        if (op.status == "SUCCESS") return "success"
        if (op.status == "PENDING") return "pending"
        return "failed"
    }
    if (op.status == "COMPLETED") return "success"
    if (op.status == "CREATED" || op.status == "PROCESSING") return "pending"
    return "failed"
}

private fun typeLabel(op: ParsedOperation): String =
    if (op.type == "tip") "Пополнение" else "Списание"

class TransactionsFragment : Fragment() {

    private val refreshIntervalMs = 60_000L
    private val handler = Handler(Looper.getMainLooper())
    private var refreshRunnable: Runnable? = null
    private var rateLimitRetryRunnable: Runnable? = null
    private var balanceUpdatedReceiver: BroadcastReceiver? = null

    private var _binding: FragmentTransactionsBinding? = null
    private val binding get() = _binding!!

    private var allOperations: List<ParsedOperation> = emptyList()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentTransactionsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.recycler.layoutManager = LinearLayoutManager(requireContext())
        binding.recycler.adapter = OpAdapter(emptyList())
        binding.swipeRefresh.setColorSchemeResources(R.color.primary)
        binding.swipeRefresh.setOnRefreshListener { load(silent = false) }
        binding.filterApply.setOnClickListener { applyAmountFilter() }
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
                refreshRunnable?.let { handler.postDelayed(it, PollJitter.withJitter(refreshIntervalMs)) }
            }
        }
        handler.postDelayed(refreshRunnable!!, PollJitter.withJitter(refreshIntervalMs))
    }

    private fun stopPeriodicRefresh() {
        refreshRunnable?.let { handler.removeCallbacks(it) }
        refreshRunnable = null
    }

    private fun cancelRateLimitRetry() {
        rateLimitRetryRunnable?.let { handler.removeCallbacks(it) }
        rateLimitRetryRunnable = null
    }

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
        } catch (_: Exception) {
            null
        }
    }

    /** После загрузки показываем все операции; фильтр по сумме — только по кнопке «Показать». */
    private fun showAllOperations() {
        val b = _binding ?: return
        b.recycler.adapter = OpAdapter(allOperations)
        updateEmptyState(allOperations.isEmpty(), parseWarning = false)
    }

    private fun applyAmountFilter() {
        val b = _binding ?: return
        val fromKop = parseRubToKop(binding.filterAmountFrom.text?.toString() ?: "")
        val toKop = parseRubToKop(binding.filterAmountTo.text?.toString() ?: "")
        val hasFrom = fromKop != null && fromKop > 0L
        val hasTo = toKop != null && toKop > 0L
        val filtered = if (!hasFrom && !hasTo) {
            allOperations
        } else {
            val from = fromKop ?: 0L
            val to = if (hasTo) toKop!! else Long.MAX_VALUE
            allOperations.filter { op ->
                val kop = if (op.type == "tip") tipNetKopForDisplay(op) else op.amountKop
                kop in from..to
            }
        }
        b.recycler.adapter = OpAdapter(filtered)
        updateEmptyState(filtered.isEmpty(), parseWarning = false)
    }

    private fun updateEmptyState(empty: Boolean, parseWarning: Boolean) {
        val b = _binding ?: return
        if (empty) {
            b.emptyText.visibility = View.VISIBLE
            b.emptyText.text = when {
                parseWarning -> getString(R.string.operations_parse_warning)
                else -> getString(R.string.operations_empty)
            }
        } else {
            b.emptyText.visibility = View.GONE
        }
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
            b.emptyText.visibility = View.GONE
        }

        ApiClient(apiKey, baseUrl).getProfile().enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { /* optional */ }
            override fun onResponse(call: Call, response: Response) {
                if (silent && response.code == 429) scheduleSilentRetryAfterRateLimit()
                if (!response.isSuccessful) return
                val body = response.body?.string() ?: return
                activity?.runOnUiThread {
                    val ui = _binding ?: return@runOnUiThread
                    if (!isAdded) return@runOnUiThread
                    val profile = parseProfileResponseSafe(body)
                    profile?.stats?.let { s ->
                        ui.virtualCardInclude.cardBalance.text = formatKopToRub(s.balanceKop)
                        BalanceCache.save(ui.root.context.applicationContext, s.balanceKop)
                    }
                }
            }
        })

        ApiClient(apiKey, baseUrl).getOperations(OperationsSync.FULL_HISTORY_LIMIT, 0).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread {
                    val ui = _binding ?: return@runOnUiThread
                    if (!isAdded) return@runOnUiThread
                    if (!silent) {
                        ui.progress.visibility = View.GONE
                        ui.swipeRefresh.isRefreshing = false
                        ui.errorText.visibility = View.VISIBLE
                        ui.errorText.text = getString(R.string.operations_load_error)
                    }
                }
            }

            override fun onResponse(call: Call, response: Response) {
                val body = runCatching { response.body?.string().orEmpty() }.getOrDefault("")
                activity?.runOnUiThread {
                    val ui = _binding ?: return@runOnUiThread
                    if (!isAdded) return@runOnUiThread
                    if (!silent) {
                        ui.progress.visibility = View.GONE
                        ui.swipeRefresh.isRefreshing = false
                    }
                    if (!response.isSuccessful) {
                        if (!silent) {
                            ui.errorText.visibility = View.VISIBLE
                            ui.errorText.text = getString(R.string.operations_http_error, response.code)
                        }
                        if (silent && response.code == 429) {
                            scheduleSilentRetryAfterRateLimit()
                        }
                        return@runOnUiThread
                    }
                    val parsed = OperationsJsonParser.parse(body)
                    allOperations = parsed.operations
                    OperationsSyncCoordinator.onParsedOperations(
                        ui.root.context.applicationContext,
                        parsed.operations,
                    )
                    if (allOperations.isEmpty() && parsed.rawCount > 0) {
                        ui.errorText.visibility = View.VISIBLE
                        ui.errorText.text = getString(R.string.operations_parse_warning)
                        ui.recycler.adapter = OpAdapter(emptyList())
                        ui.emptyText.visibility = View.GONE
                    } else {
                        ui.errorText.visibility = View.GONE
                        showAllOperations()
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

private fun tipNetKopForDisplay(op: ParsedOperation): Long {
    if (op.type != "tip") return op.amountKop
    val fee = op.feeKop.coerceAtLeast(0L)
    val net = op.tipNetKop ?: (op.amountKop - fee).coerceAtLeast(0L)
    return net.takeIf { it > 0L } ?: op.amountKop
}

class OpAdapter(private val items: List<ParsedOperation>) : RecyclerView.Adapter<OpAdapter.VH>() {
    class VH(val binding: ItemTransactionBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(ItemTransactionBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        runCatching {
            val op = items[position]
            val kop = if (op.type == "payout") op.amountKop else tipNetKopForDisplay(op)
            val rub = kop.toDouble() / 100.0
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
        }.onFailure {
            holder.binding.amount.text = "0.00 ₽"
            holder.binding.typeLabel.text = "Операция"
            holder.binding.date.text = ""
            holder.binding.statusIcon.setImageResource(R.drawable.ic_status_failed)
        }
    }

    override fun getItemCount(): Int = items.size
}
