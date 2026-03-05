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
import com.google.gson.Gson
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Response
import java.io.IOException

data class PayoutsResponse(val payouts: List<PayoutItem>, val balanceKop: Int)
data class PayoutItem(val id: String, val amountKop: Int, val status: String, val createdAt: String, val details: String)

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
        binding.fab.setOnClickListener { showCreatePayoutDialog() }
    }

    private fun loadPayouts() {
        val prefs = SecurePrefs(requireContext())
        val apiKey = prefs.apiKey ?: run {
            binding.swipeRefresh.isRefreshing = false
            return
        }
        if (!binding.swipeRefresh.isRefreshing) binding.progress.visibility = View.VISIBLE
        binding.errorText.visibility = View.GONE

        ApiClient(apiKey, prefs.effectiveBaseUrl).getPayouts().enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread {
                    binding.progress.visibility = View.GONE
                    binding.swipeRefresh.isRefreshing = false
                    binding.errorText.visibility = View.VISIBLE
                    binding.errorText.text = "Ошибка загрузки"
                }
            }

            override fun onResponse(call: Call, response: Response) {
                activity?.runOnUiThread {
                    binding.progress.visibility = View.GONE
                    binding.swipeRefresh.isRefreshing = false
                    if (response.isSuccessful) {
                        val body = response.body?.string() ?: ""
                        try {
                            val data = Gson().fromJson(body, PayoutsResponse::class.java)
                            binding.virtualCardInclude.cardBalance.text = formatKop(data.balanceKop)
                            binding.recycler.adapter = PayoutAdapter(data.payouts)
                        } catch (_: Exception) {}
                    } else {
                        binding.errorText.visibility = View.VISIBLE
                        binding.errorText.text = "Ошибка ${response.code}"
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
                        activity?.runOnUiThread {
                            if (response.isSuccessful) {
                                Toast.makeText(requireContext(), "Заявка создана", Toast.LENGTH_SHORT).show()
                                loadPayouts()
                            } else {
                                val err = response.body?.string()?.let { Gson().fromJson(it, Map::class.java)?.get("error")?.toString() } ?: "Ошибка"
                                Toast.makeText(requireContext(), err, Toast.LENGTH_LONG).show()
                            }
                        }
                    }
                })
            }
            .setNegativeButton(getString(R.string.dialog_cancel), null)
            .show()
    }

    private fun formatKop(kop: Int): String = com.freetips.app.util.formatKopToRub(kop)

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
        holder.binding.date.text = p.createdAt.take(10)
        val iconRes = when (payoutStatusKind(p.status)) {
            "success" -> R.drawable.ic_status_success
            "pending" -> R.drawable.ic_status_pending
            else -> R.drawable.ic_status_failed
        }
        holder.binding.statusIcon.setImageResource(iconRes)
    }

    override fun getItemCount(): Int = items.size
}
