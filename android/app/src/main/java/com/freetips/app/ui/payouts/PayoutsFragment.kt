package com.freetips.app.ui.payouts

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.freetips.app.R
import com.freetips.app.data.ApiClient
import com.freetips.app.data.SecurePrefs
import com.freetips.app.databinding.FragmentPayoutsBinding
import com.freetips.app.databinding.ItemPayoutBinding
import com.freetips.app.util.MoscowDateTime
import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Response
import java.io.IOException

data class PayoutsResponse(val payouts: List<PayoutItem>, val balanceKop: Long)
data class PayoutItem(
    val id: String,
    val amountKop: Long,
    val status: String,
    val createdAt: String,
    val details: String?
)

private fun JsonObject.stringOrEmpty(name: String): String =
    this.get(name)?.takeIf { it.isJsonPrimitive }?.asString?.trim().orEmpty()

private fun JsonElement?.asLongSafe(): Long? {
    if (this == null || !this.isJsonPrimitive) return null
    val p = this.asJsonPrimitive
    return when {
        p.isNumber -> p.asBigDecimal.toLong()
        p.isString -> p.asString.trim().toLongOrNull()
        else -> null
    }
}

private fun parsePayoutsResponseSafe(json: String): PayoutsResponse {
    val root = runCatching { Gson().fromJson(json, JsonObject::class.java) }.getOrNull()
        ?: return PayoutsResponse(emptyList(), 0L)
    val balanceKop = root.get("balanceKop").asLongSafe() ?: 0L
    val payoutsArray = root.getAsJsonArray("payouts") ?: return PayoutsResponse(emptyList(), balanceKop)
    val payouts = payoutsArray.mapNotNull { el ->
        val obj = el?.takeIf { it.isJsonObject }?.asJsonObject ?: return@mapNotNull null
        val id = obj.stringOrEmpty("id")
        val amountKop = obj.get("amountKop").asLongSafe() ?: return@mapNotNull null
        val status = obj.stringOrEmpty("status").uppercase().ifEmpty { "UNKNOWN" }
        val createdAt = obj.stringOrEmpty("createdAt")
        val details = obj.get("details")?.takeIf { it.isJsonPrimitive }?.asString
        if (id.isEmpty() || createdAt.isEmpty()) return@mapNotNull null
        PayoutItem(id = id, amountKop = amountKop.coerceAtLeast(0L), status = status, createdAt = createdAt, details = details)
    }
    return PayoutsResponse(payouts, balanceKop)
}

class PayoutsFragment : Fragment() {

    private var _binding: FragmentPayoutsBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentPayoutsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.recycler.layoutManager = LinearLayoutManager(requireContext())
        binding.swipeRefresh.setColorSchemeResources(R.color.primary)
        binding.swipeRefresh.setOnRefreshListener { loadPayouts() }
        loadPayouts()
        binding.btnPayout.setOnClickListener { showCreatePayoutDialog() }
    }

    private fun loadPayouts() {
        val b = _binding ?: return
        val ctx = context ?: return
        val prefs = SecurePrefs(ctx)
        val apiKey = prefs.apiKey ?: run {
            b.swipeRefresh.isRefreshing = false
            return
        }
        if (!b.swipeRefresh.isRefreshing) b.progress.visibility = View.VISIBLE
        b.errorText.visibility = View.GONE

        ApiClient(apiKey, prefs.effectiveBaseUrl).getPayouts().enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread {
                    val ui = _binding ?: return@runOnUiThread
                    ui.progress.visibility = View.GONE
                    ui.swipeRefresh.isRefreshing = false
                    ui.errorText.visibility = View.VISIBLE
                    ui.errorText.text = "Ошибка загрузки"
                }
            }

            override fun onResponse(call: Call, response: Response) {
                val body = response.body?.string() ?: ""
                val code = response.code
                val ok = response.isSuccessful
                activity?.runOnUiThread {
                    val ui = _binding ?: return@runOnUiThread
                    ui.progress.visibility = View.GONE
                    ui.swipeRefresh.isRefreshing = false
                    if (ok) {
                        try {
                            val data = parsePayoutsResponseSafe(body)
                            ui.virtualCardInclude.cardBalance.text = formatKop(data.balanceKop)
                            ui.recycler.adapter = PayoutAdapter(data.payouts)
                        } catch (_: Exception) {}
                    } else {
                        ui.errorText.visibility = View.VISIBLE
                        ui.errorText.text = "Ошибка $code"
                    }
                }
            }
        })
    }

    private fun showCreatePayoutDialog() {
        val apiKey = SecurePrefs(requireContext()).apiKey ?: return
        val amountEdit = EditText(requireContext()).apply {
            hint = "Сумма (₽)"
            setRawInputType(android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL)
        }
        val detailsEdit = EditText(requireContext()).apply { hint = "Реквизиты (карта или телефон)" }
        val container = android.widget.LinearLayout(requireContext()).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(48, 24, 48, 24)
            addView(amountEdit, android.widget.LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { bottomMargin = 16 })
            addView(detailsEdit, android.widget.LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        }
        AlertDialog.Builder(requireContext())
            .setTitle("Вывод средств")
            .setView(container)
            .setPositiveButton("Отправить") { _, _ ->
                val rub = amountEdit.text.toString().toDoubleOrNull() ?: 0.0
                val details = detailsEdit.text.toString().trim()
                if (rub < 1 || details.isEmpty()) {
                    Toast.makeText(requireContext(), "Укажите сумму и реквизиты", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val amountKop = (rub * 100).toLong()
                ApiClient(apiKey, SecurePrefs(requireContext()).effectiveBaseUrl).postPayout(amountKop, details).enqueue(object : Callback {
                    override fun onFailure(call: Call, e: IOException) {
                        activity?.runOnUiThread { Toast.makeText(requireContext(), "Ошибка сети", Toast.LENGTH_SHORT).show() }
                    }
                    override fun onResponse(call: Call, response: Response) {
                        val ok = response.isSuccessful
                        val err = if (!ok) {
                            response.body?.string()
                                ?.let { Gson().fromJson(it, Map::class.java)?.get("error")?.toString() }
                                ?: "Ошибка"
                        } else {
                            ""
                        }
                        activity?.runOnUiThread {
                            if (ok) {
                                Toast.makeText(requireContext(), "Заявка создана", Toast.LENGTH_SHORT).show()
                                loadPayouts()
                            } else {
                                Toast.makeText(requireContext(), err, Toast.LENGTH_LONG).show()
                            }
                        }
                    }
                })
            }
            .setNegativeButton(getString(R.string.dialog_cancel), null)
            .show()
    }

    private fun formatKop(kop: Long): String = com.freetips.app.util.formatKopToRub(kop)

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}

private fun payoutStatusKind(status: String): String {
    return when (status) {
        "COMPLETED" -> "success"
        "CREATED", "PROCESSING" -> "pending"
        else -> "failed"
    }
}

private fun payoutStatusLabel(status: String): String {
    return when (status) {
        "COMPLETED" -> "Выполнена"
        "CREATED" -> "Создана"
        "PROCESSING" -> "В обработке"
        "REJECTED" -> "Отклонена"
        else -> status
    }
}

class PayoutAdapter(private val items: List<PayoutItem>) : RecyclerView.Adapter<PayoutAdapter.VH>() {
    class VH(val binding: ItemPayoutBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): VH =
        VH(ItemPayoutBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val p = items[position]
        holder.binding.amount.text = com.freetips.app.util.formatKopToRub(p.amountKop)
        holder.binding.statusLabel.text = payoutStatusLabel(p.status)
        holder.binding.date.text = MoscowDateTime.formatCreatedAtDateOnly(p.createdAt)
        val iconRes = when (payoutStatusKind(p.status)) {
            "success" -> R.drawable.ic_status_success
            "pending" -> R.drawable.ic_status_pending
            else -> R.drawable.ic_status_failed
        }
        holder.binding.statusIcon.setImageResource(iconRes)
    }

    override fun getItemCount(): Int = items.size
}
