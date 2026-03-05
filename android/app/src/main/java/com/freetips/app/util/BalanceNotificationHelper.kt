package com.freetips.app.util

import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.freetips.app.App
import com.freetips.app.R

/**
 * Уведомления только о пополнении (с суммой): в шторку и в список по колокольчику.
 */
object BalanceNotificationHelper {

    private const val PREFS_NAME = "balance_notification"
    private const val KEY_LAST_TOTAL_RECEIVED_KOP = "last_total_received_kop"
    private const val KEY_LAST_BALANCE_KOP = "last_balance_kop"
    private const val KEY_ITEMS_JSON = "notification_items_json"
    private const val KEY_LAST_VIEWED_MILLIS = "last_viewed_millis"
    private const val MAX_ITEMS = 100
    private const val NOTIFICATION_ID_TOPUP = 1

    /**
     * Только пополнение: сравнивает с последним «всего получено», при увеличении показывает
     * уведомление в шторке с суммой и добавляет запись в список по колокольчику.
     * При первом запуске (lastTotal < 0) уведомление не показываем — только сохраняем базу для сравнения.
     */
    fun showIfNeeded(context: Context, balanceKop: Int, totalReceivedKop: Int) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val lastTotal = prefs.getInt(KEY_LAST_TOTAL_RECEIVED_KOP, -1)

        val hadTopUp = lastTotal >= 0 && totalReceivedKop > lastTotal
        if (hadTopUp) {
            val addKop = totalReceivedKop - lastTotal
            showTopUpAndSave(context, addKop)
        }

        prefs.edit()
            .putInt(KEY_LAST_TOTAL_RECEIVED_KOP, totalReceivedKop)
            .putInt(KEY_LAST_BALANCE_KOP, balanceKop)
            .apply()
    }

    private fun showTopUpAndSave(context: Context, addKop: Int) {
        val rubText = formatKopToRub(addKop)
        val title = context.getString(R.string.notification_topup_title)
        val text = context.getString(R.string.notification_topup_body, rubText)
        showSystemNotification(context, title, text)
        addToInAppList(context, addKop, text)
    }

    private fun showSystemNotification(context: Context, title: String, text: String) {
        val builder = NotificationCompat.Builder(context, App.CHANNEL_BALANCE)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
        try {
            if (NotificationManagerCompat.from(context).areNotificationsEnabled()) {
                NotificationManagerCompat.from(context).notify(NOTIFICATION_ID_TOPUP, builder.build())
            }
        } catch (_: SecurityException) { }
    }

    private fun addToInAppList(context: Context, amountKop: Int, displayText: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val json = prefs.getString(KEY_ITEMS_JSON, "[]") ?: "[]"
        val gson = com.google.gson.Gson()
        val list = try {
            val arr = gson.fromJson(json, com.google.gson.JsonArray::class.java) ?: com.google.gson.JsonArray()
            (0 until arr.size()).map { arr.get(it).asJsonObject }.toMutableList()
        } catch (_: Exception) {
            mutableListOf<com.google.gson.JsonObject>()
        }
        val obj = com.google.gson.JsonObject().apply {
            addProperty("amountKop", amountKop)
            addProperty("text", displayText)
            addProperty("time", System.currentTimeMillis())
        }
        list.add(0, obj)
        while (list.size > MAX_ITEMS) list.removeAt(list.size - 1)
        val out = gson.toJson(list)
        prefs.edit().putString(KEY_ITEMS_JSON, out).apply()
    }

    data class NotificationItem(val amountKop: Int, val text: String, val timeMillis: Long)

    fun getInAppList(context: Context): List<NotificationItem> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val json = prefs.getString(KEY_ITEMS_JSON, "[]") ?: "[]"
        return try {
            val arr = com.google.gson.Gson().fromJson(json, com.google.gson.JsonArray::class.java) ?: return emptyList()
            (0 until arr.size()).mapNotNull { i ->
                val obj = arr.get(i).asJsonObject
                val amount = obj.get("amountKop")?.takeIf { it.isJsonPrimitive }?.asInt ?: return@mapNotNull null
                val text = obj.get("text")?.asString ?: ""
                val time = obj.get("time")?.asLong ?: 0L
                NotificationItem(amount, text, time)
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun clearInAppList(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putString(KEY_ITEMS_JSON, "[]").apply()
    }

    /** Количество непросмотренных уведомлений (по времени последнего просмотра). */
    fun getUnreadCount(context: Context): Int {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val viewedAt = prefs.getLong(KEY_LAST_VIEWED_MILLIS, 0L)
        return getInAppList(context).count { it.timeMillis > viewedAt }
    }

    /** Вызывать при открытии экрана уведомлений: все текущие считаются просмотренными. */
    fun markAllAsViewed(context: Context) {
        val list = getInAppList(context)
        val viewedAt = if (list.isEmpty()) System.currentTimeMillis()
        else list.maxOf { it.timeMillis }
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putLong(KEY_LAST_VIEWED_MILLIS, viewedAt).apply()
    }
}
