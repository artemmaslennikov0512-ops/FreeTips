package com.freetips.app.ui.notifications

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.freetips.app.R
import com.freetips.app.databinding.BottomSheetNotificationsBinding
import com.freetips.app.databinding.ItemNotificationBinding
import com.freetips.app.util.BalanceNotificationHelper
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class NotificationsBottomSheet : BottomSheetDialogFragment() {

    companion object {
        const val TAG = "notifications"
    }

    interface BadgeUpdater {
        fun onNotificationsViewed()
    }

    private var _binding: BottomSheetNotificationsBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = BottomSheetNotificationsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        BalanceNotificationHelper.markAllAsViewed(requireContext())
        binding.recycler.layoutManager = LinearLayoutManager(requireContext())
        binding.btnClear.setOnClickListener {
            BalanceNotificationHelper.clearInAppList(requireContext())
            refreshList()
        }
        refreshList()
    }

    private fun refreshList() {
        val list = BalanceNotificationHelper.getInAppList(requireContext())
        binding.emptyText.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
        binding.recycler.adapter = Adapter(list)
    }

    override fun onDestroyView() {
        (activity as? BadgeUpdater)?.onNotificationsViewed()
        _binding = null
        super.onDestroyView()
    }

    private class Adapter(private val items: List<BalanceNotificationHelper.NotificationItem>) :
        RecyclerView.Adapter<Adapter.VH>() {

        private val timeFormat = SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.getDefault())

        class VH(val binding: ItemNotificationBinding) : RecyclerView.ViewHolder(binding.root)

        override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): VH =
            VH(ItemNotificationBinding.inflate(LayoutInflater.from(parent.context), parent, false))

        override fun onBindViewHolder(holder: VH, position: Int) {
            val item = items[position]
            holder.binding.notificationText.text = item.text
            holder.binding.notificationTime.text = timeFormat.format(Date(item.timeMillis))
        }

        override fun getItemCount(): Int = items.size
    }
}
