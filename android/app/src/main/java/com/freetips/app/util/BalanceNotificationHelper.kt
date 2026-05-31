package com.freetips.app.util

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.freetips.app.App
import com.freetips.app.MainActivity
import com.freetips.app.R
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonObject

/**
 * Локальный колокольчик (inbox) и системные пуши.
 * Отметки «пуш обработан» — только в [TipPushMarkStore]; здесь дублей по tip-id нет.
 */
object BalanceNotificationHelper {

    const val ACTION_TIP_NOTIFICATION_DELIVERED = "com.freetips.app.TIP_NOTIFICATION_DELIVERED"

    private const val PREFS_NAME = "balance_notification"
    private const val KEY_ITEMS_JSON = "notification_items_json"
    private const val KEY_LAST_VIEWED_MILLIS = "last_viewed_millis"
    private const val MAX_ITEMS = 100
    private const val NOTIFICATION_ID_BASE = 10_000

    /** Запись в колокольчик после успешной отметки в [TipPushMarkStore]. */
    internal fun recordDeliveredTip(
        context: Context,
        tipId: String,
        amountKop: Int,
        text: String,
        timeMillis: Long,
    ) {
        if (tipId.isBlank()) return
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val gson = Gson()
        val list = loadInAppJsonObjects(prefs, gson)
        if (list.any { it.get("tipId")?.asString == tipId }) return

        val obj = JsonObject().apply {
            addProperty("tipId", tipId)
            addProperty("amountKop", amountKop)
            addProperty("text", text)
            addProperty("time", timeMillis)
        }
        list.add(0, obj)
        while (list.size > MAX_ITEMS) list.removeAt(list.size - 1)
        prefs.edit().putString(KEY_ITEMS_JSON, gson.toJson(list)).commit()
    }

    internal fun showSystemPush(context: Context, title: String, text: String, tipId: String) {
        val openApp = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pending = PendingIntent.getActivity(
            context,
            tipId.hashCode(),
            openApp,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val builder = NotificationCompat.Builder(context, App.CHANNEL_BALANCE)
            .setSmallIcon(R.drawable.ic_notification_small)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(pending)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
        try {
            if (NotificationManagerCompat.from(context).areNotificationsEnabled()) {
                NotificationManagerCompat.from(context).notify(notificationIdForTip(tipId), builder.build())
            }
        } catch (_: SecurityException) { }
    }

    private fun notificationIdForTip(tipId: String): Int =
        NOTIFICATION_ID_BASE + (tipId.hashCode() and 0x7FFF)

    private fun loadInAppJsonObjects(
        prefs: android.content.SharedPreferences,
        gson: Gson,
    ): MutableList<JsonObject> =
        try {
            val json = prefs.getString(KEY_ITEMS_JSON, "[]") ?: "[]"
            val arr = gson.fromJson(json, JsonArray::class.java) ?: JsonArray()
            (0 until arr.size()).map { arr.get(it).asJsonObject }.toMutableList()
        } catch (_: Exception) {
            mutableListOf()
        }

    data class NotificationItem(
        val tipId: String?,
        val amountKop: Int,
        val text: String,
        val timeMillis: Long,
    )

    fun getInAppList(context: Context): List<NotificationItem> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return try {
            loadInAppJsonObjects(prefs, Gson()).mapNotNull { obj ->
                val amount = obj.get("amountKop")?.takeIf { it.isJsonPrimitive }?.asInt ?: return@mapNotNull null
                val text = obj.get("text")?.asString ?: ""
                val time = obj.get("time")?.asLong ?: 0L
                val tipId = obj.get("tipId")?.takeIf { it.isJsonPrimitive }?.asString
                NotificationItem(tipId, amount, text, time)
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun clearInAppList(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putString(KEY_ITEMS_JSON, "[]").commit()
    }

    fun getUnreadCount(context: Context): Int {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val viewedAt = prefs.getLong(KEY_LAST_VIEWED_MILLIS, 0L)
        return getInAppList(context).count { it.timeMillis > viewedAt }
    }

    fun markAllAsViewed(context: Context) {
        val list = getInAppList(context)
        val viewedAt = if (list.isEmpty()) System.currentTimeMillis()
        else list.maxOf { it.timeMillis }
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putLong(KEY_LAST_VIEWED_MILLIS, viewedAt).commit()
    }
}
