package com.freetips.app.util

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.freetips.app.App
import com.freetips.app.MainActivity
import com.freetips.app.R

/**
 * Уведомления только о пополнении (с суммой): в шторку и в список по колокольчику.
 * Сумма в пуше — как списано с гостя (amount Register + комиссия по карте/СБП), см. stats.totalGuestPaidTipsKop.
 * Для текста пуша сумма округляется до целого рубля (копейки не показываем); в БД и Paygine это не влияет.
 */
object BalanceNotificationHelper {

    private const val PREFS_NAME = "balance_notification"
    /** База для сравнения: накопитель «списано с гостей» (amount + fee), не нетто на баланс. */
    private const val KEY_LAST_GUEST_PAID_TIPS_KOP = "last_guest_paid_tips_kop"
    private const val KEY_LAST_BALANCE_KOP = "last_balance_kop"
    private const val KEY_ITEMS_JSON = "notification_items_json"
    private const val KEY_LAST_VIEWED_MILLIS = "last_viewed_millis"
    /**
     * v2: только totalGuestPaidTipsKop (без fallback на totalReceivedKop — иначе два пуша: 50 ₽ + 1 ₽).
     */
    private const val KEY_BASIS_SCHEMA = "notify_basis_schema"
    private const val SCHEMA_GUEST_PAID_ONLY = 2
    private const val MAX_ITEMS = 100
    private const val NOTIFICATION_ID_TOPUP = 1

    private val lock = Any()

    /**
     * @param totalGuestPaidTipsKop с сервера (amount Register + fee по карте/СБП по вашим SUCCESS).
     */
    fun showIfNeeded(
        context: Context,
        balanceKop: Int,
        totalGuestPaidTipsKop: Int,
    ) {
        synchronized(lock) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            if (prefs.getInt(KEY_BASIS_SCHEMA, 0) < SCHEMA_GUEST_PAID_ONLY) {
                prefs.edit()
                    .putInt(KEY_LAST_GUEST_PAID_TIPS_KOP, totalGuestPaidTipsKop.coerceAtLeast(0))
                    .putInt(KEY_BASIS_SCHEMA, SCHEMA_GUEST_PAID_ONLY)
                    .putInt(KEY_LAST_BALANCE_KOP, balanceKop)
                    .apply()
                return
            }

            val lastBasis = prefs.getInt(KEY_LAST_GUEST_PAID_TIPS_KOP, -1)
            val basis = totalGuestPaidTipsKop.coerceAtLeast(0)

            if (lastBasis < 0) {
                prefs.edit()
                    .putInt(KEY_LAST_GUEST_PAID_TIPS_KOP, basis)
                    .putInt(KEY_LAST_BALANCE_KOP, balanceKop)
                    .apply()
                return
            }

            if (basis > lastBasis) {
                val addKop = basis - lastBasis
                val displayKop = kotlin.math.round(addKop / 100.0).toInt() * 100
                if (displayKop > 0) {
                    showTopUpAndSave(context, displayKop)
                }
            }

            prefs.edit()
                .putInt(KEY_LAST_GUEST_PAID_TIPS_KOP, basis)
                .putInt(KEY_LAST_BALANCE_KOP, balanceKop)
                .apply()
        }
    }

    private fun showTopUpAndSave(context: Context, addKop: Int) {
        val rubText = formatKopToRub(addKop)
        val title = context.getString(R.string.notification_topup_title)
        val text = context.getString(R.string.notification_topup_body, rubText)
        showSystemNotification(context, title, text)
        addToInAppList(context, addKop, text)
    }

    private fun showSystemNotification(context: Context, title: String, text: String) {
        val openApp = Intent(context, MainActivity::class.java).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP }
        val pending = PendingIntent.getActivity(context, 0, openApp, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
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
