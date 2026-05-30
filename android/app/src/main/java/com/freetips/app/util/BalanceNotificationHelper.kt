package com.freetips.app.util

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.freetips.app.App
import com.freetips.app.MainActivity
import com.freetips.app.R
import com.google.gson.JsonArray
import com.google.gson.JsonObject

/**
 * Уведомления о пополнении: один SUCCESS tip — один пуш и одна запись в колокольчике.
 * Сумма в пуше — amountKop (сколько заплатил гость, напр. 100 ₽).
 * В истории операций показывается tipNetKop (нетто после комиссии, напр. 97,50 ₽).
 */
object BalanceNotificationHelper {

    private const val PREFS_NAME = "balance_notification"
    private const val KEY_LAST_GUEST_PAID_TIPS_KOP = "last_guest_paid_tips_kop"
    private const val KEY_LAST_BALANCE_KOP = "last_balance_kop"
    private const val KEY_ITEMS_JSON = "notification_items_json"
    private const val KEY_LAST_VIEWED_MILLIS = "last_viewed_millis"
    /** tip-id, по которым уже отправляли пуш (или пометили при первичной инициализации). */
    private const val KEY_NOTIFIED_TIP_IDS_JSON = "notified_tip_ids_json"
    /** @deprecated читается только при миграции v5 */
    private const val KEY_SEEN_TIP_IDS_JSON = "seen_tip_ids_json"
    private const val KEY_BASIS_SCHEMA = "notify_basis_schema"
    private const val KEY_TIPS_BOOTSTRAP_DONE = "tips_bootstrap_done"
    private const val KEY_V5_MIGRATED = "notify_v5_migrated"
    private const val KEY_LEGACY_RECONCILE_DONE = "notify_legacy_reconcile_done"
    private const val SCHEMA_GUEST_PAID_ONLY = 2
    private const val SCHEMA_TIP_ID_DEDUP = 5
    private const val MAX_ITEMS = 100
    private const val MAX_NOTIFIED_TIP_IDS = 500
    private const val NOTIFICATION_ID_BASE = 10_000

    private val lock = Any()

    data class TipOperation(
        val id: String,
        val amountKop: Int,
        val feeKop: Int = 0,
        val tipNetKop: Int? = null,
        val status: String,
        val createdAtMillis: Long = System.currentTimeMillis(),
    )

    /**
     * Пуш: сколько заплатил гость (100 ₽), не нетто на баланс (97,50 ₽).
     * Берём max(amountKop, tipNetKop + feeKop) — на случай если в API amount ещё без fee.
     */
    private fun displayKopForPush(tip: TipOperation): Int {
        val fee = tip.feeKop.coerceAtLeast(0)
        val net = tip.tipNetKop ?: (tip.amountKop - fee).coerceAtLeast(0)
        val gross = maxOf(tip.amountKop, net + fee)
        return kotlin.math.round(gross / 100.0).toInt() * 100
    }

    /** Обновляет базу totalGuestPaidTipsKop; пуши не шлёт. */
    fun showIfNeeded(
        context: Context,
        balanceKop: Int,
        totalGuestPaidTipsKop: Int,
    ) {
        synchronized(lock) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            migrateToV5IfNeeded(prefs)

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

            prefs.edit()
                .putInt(KEY_LAST_GUEST_PAID_TIPS_KOP, basis)
                .putInt(KEY_LAST_BALANCE_KOP, balanceKop)
                .apply()
        }
    }

    /**
     * Синхронизация с /api/operations.
     * Новые tip-id → пуш + запись в колокольчик; уже известные tip-id пропускаются.
     */
    fun syncIncomingTips(
        context: Context,
        tips: List<TipOperation>,
        @Suppress("UNUSED_PARAMETER") totalGuestPaidTipsKop: Int? = null,
    ) {
        synchronized(lock) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            migrateToV5IfNeeded(prefs)

            val normalized = tips
                .asSequence()
                .filter { it.status == "SUCCESS" }
                .filter { it.id.isNotBlank() && it.amountKop > 0 }
                .distinctBy { it.id }
                .toList()
            if (normalized.isEmpty()) return

            val notifiedIds = getNotifiedTipIds(prefs).toMutableSet()
            val inAppTipIds = getInAppTipIds(prefs)
            notifiedIds.addAll(inAppTipIds)

            if (!prefs.getBoolean(KEY_TIPS_BOOTSTRAP_DONE, false)) {
                for (tip in normalized) {
                    notifiedIds.add(tip.id)
                }
                saveNotifiedTipIds(prefs, notifiedIds)
                prefs.edit()
                    .putBoolean(KEY_TIPS_BOOTSTRAP_DONE, true)
                    .putInt(KEY_BASIS_SCHEMA, SCHEMA_TIP_ID_DEDUP)
                    .apply()
                return
            }

            if (!prefs.getBoolean(KEY_LEGACY_RECONCILE_DONE, false)) {
                reconcileLegacyInAppItems(prefs, normalized, notifiedIds)
                prefs.edit().putBoolean(KEY_LEGACY_RECONCILE_DONE, true).apply()
            }

            // Сначала старые, потом новые — естественный порядок в шторке.
            val pending = normalized
                .filter { !notifiedIds.contains(it.id) }
                .asReversed()

            for (tip in pending) {
                val displayKop = displayKopForPush(tip)
                if (displayKop <= 0) {
                    notifiedIds.add(tip.id)
                    continue
                }
                deliverTipNotification(context, prefs, tip, displayKop, notifiedIds)
            }

            saveNotifiedTipIds(prefs, notifiedIds)
        }
    }

    fun syncIncomingTipsFromOperationsJson(
        context: Context,
        operationsJson: String,
        totalGuestPaidTipsKop: Int? = null,
    ) {
        val root = runCatching { com.google.gson.Gson().fromJson(operationsJson, JsonObject::class.java) }.getOrNull()
            ?: return
        val arr = root.getAsJsonArray("operations") ?: return
        val tips = (0 until arr.size()).mapNotNull { idx ->
            val obj = arr.get(idx)?.takeIf { it.isJsonObject }?.asJsonObject ?: return@mapNotNull null
            val id = obj.get("id")?.takeIf { it.isJsonPrimitive }?.asString?.trim().orEmpty()
            val type = obj.get("type")?.takeIf { it.isJsonPrimitive }?.asString?.trim().orEmpty()
            val status = obj.get("status")?.takeIf { it.isJsonPrimitive }?.asString?.trim().orEmpty()
            val amountRaw = obj.get("amountKop")?.takeIf { it.isJsonPrimitive }?.asString?.trim()
            val amount = amountRaw?.toLongOrNull()
                ?: runCatching { obj.get("amountKop")?.asLong }.getOrNull()
                ?: 0L
            val feeKop = parseLongField(obj, "feeKop")?.coerceAtMost(Int.MAX_VALUE.toLong())?.toInt() ?: 0
            val tipNetKop = parseLongField(obj, "tipNetKop")?.coerceAtMost(Int.MAX_VALUE.toLong())?.toInt()
            val createdAtMillis = parseCreatedAtMillis(obj.get("createdAt"))
            if (type != "tip" || status != "SUCCESS" || id.isEmpty() || amount <= 0L) return@mapNotNull null
            TipOperation(
                id = id,
                amountKop = amount.coerceAtMost(Int.MAX_VALUE.toLong()).toInt(),
                feeKop = feeKop,
                tipNetKop = tipNetKop,
                status = status,
                createdAtMillis = createdAtMillis,
            )
        }
        if (tips.isNotEmpty()) syncIncomingTips(context, tips, totalGuestPaidTipsKop)
    }

    private fun deliverTipNotification(
        context: Context,
        prefs: android.content.SharedPreferences,
        tip: TipOperation,
        displayKop: Int,
        notifiedIds: MutableSet<String>,
    ) {
        if (!notifiedIds.add(tip.id)) return

        val rubText = formatKopToRub(displayKop)
        val title = context.getString(R.string.notification_topup_title)
        val text = context.getString(R.string.notification_topup_body, rubText)
        showSystemNotification(context, title, text, tip.id)
        addToInAppList(context, tip.id, displayKop, text, tip.createdAtMillis)
        saveNotifiedTipIds(prefs, notifiedIds)
    }

    /**
     * Старые записи в колокольчике без tipId сопоставляем с операциями по сумме,
     * чтобы не продублировать уже показанные пуши и не потерять пропущенные offline.
     */
    private fun reconcileLegacyInAppItems(
        prefs: android.content.SharedPreferences,
        normalized: List<TipOperation>,
        notifiedIds: MutableSet<String>,
    ) {
        val gson = com.google.gson.Gson()
        val list = loadInAppJsonObjects(prefs, gson)
        if (list.isEmpty()) return

        val unmatchedTips = normalized
            .filter { !notifiedIds.contains(it.id) }
            .sortedByDescending { it.createdAtMillis }
            .toMutableList()

        var changed = false
        for (obj in list) {
            val existingTipId = obj.get("tipId")?.takeIf { it.isJsonPrimitive }?.asString?.trim().orEmpty()
            if (existingTipId.isNotEmpty()) {
                notifiedIds.add(existingTipId)
                continue
            }
            val amountKop = obj.get("amountKop")?.takeIf { it.isJsonPrimitive }?.asInt ?: continue
            val matchIdx = unmatchedTips.indexOfFirst { tip ->
                val pushKop = displayKopForPush(tip)
                val netKop = tip.tipNetKop
                    ?: (tip.amountKop - tip.feeKop.coerceAtLeast(0)).coerceAtLeast(0)
                pushKop == amountKop || netKop == amountKop
            }
            if (matchIdx < 0) continue
            val match = unmatchedTips.removeAt(matchIdx)
            obj.addProperty("tipId", match.id)
            notifiedIds.add(match.id)
            changed = true
        }

        if (changed) {
            prefs.edit().putString(KEY_ITEMS_JSON, gson.toJson(list)).apply()
        }
    }

    private fun migrateToV5IfNeeded(prefs: android.content.SharedPreferences) {
        if (prefs.getBoolean(KEY_V5_MIGRATED, false)) return

        // Не переносим старый seen_tip_ids — он мог содержать offline-чаевые без реального пуша.
        val notified = getInAppTipIds(prefs).toMutableSet()
        saveNotifiedTipIds(prefs, notified)
        prefs.edit()
            .remove(KEY_SEEN_TIP_IDS_JSON)
            .putBoolean(KEY_V5_MIGRATED, true)
            .putBoolean(KEY_TIPS_BOOTSTRAP_DONE, prefs.getInt(KEY_BASIS_SCHEMA, 0) >= SCHEMA_GUEST_PAID_ONLY)
            .putInt(KEY_BASIS_SCHEMA, SCHEMA_TIP_ID_DEDUP)
            .apply()
    }

    private fun parseLongField(obj: JsonObject, name: String): Long? {
        val el = obj.get(name) ?: return null
        if (!el.isJsonPrimitive) return null
        val p = el.asJsonPrimitive
        return when {
            p.isNumber -> p.asLong
            p.isString -> p.asString.trim().toLongOrNull()
            else -> null
        }
    }

    private fun parseCreatedAtMillis(element: com.google.gson.JsonElement?): Long {
        if (element == null || !element.isJsonPrimitive) return System.currentTimeMillis()
        val raw = element.asString.trim()
        if (raw.isEmpty()) return System.currentTimeMillis()
        return runCatching {
            java.time.Instant.parse(raw).toEpochMilli()
        }.getOrElse {
            runCatching {
                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                    .parse(raw)?.time
            }.getOrNull() ?: System.currentTimeMillis()
        }
    }

    private fun notificationIdForTip(tipId: String): Int =
        NOTIFICATION_ID_BASE + (tipId.hashCode() and 0x7FFF)

    private fun showSystemNotification(context: Context, title: String, text: String, tipId: String) {
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

    private fun addToInAppList(
        context: Context,
        tipId: String,
        amountKop: Int,
        displayText: String,
        timeMillis: Long,
    ) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val gson = com.google.gson.Gson()
        val list = loadInAppJsonObjects(prefs, gson)
        if (list.any { it.get("tipId")?.asString == tipId }) return

        val obj = JsonObject().apply {
            addProperty("tipId", tipId)
            addProperty("amountKop", amountKop)
            addProperty("text", displayText)
            addProperty("time", timeMillis)
        }
        list.add(0, obj)
        while (list.size > MAX_ITEMS) list.removeAt(list.size - 1)
        prefs.edit().putString(KEY_ITEMS_JSON, gson.toJson(list)).apply()
    }

    private fun loadInAppJsonObjects(
        prefs: android.content.SharedPreferences,
        gson: com.google.gson.Gson,
    ): MutableList<JsonObject> =
        try {
            val json = prefs.getString(KEY_ITEMS_JSON, "[]") ?: "[]"
            val arr = gson.fromJson(json, JsonArray::class.java) ?: JsonArray()
            (0 until arr.size()).map { arr.get(it).asJsonObject }.toMutableList()
        } catch (_: Exception) {
            mutableListOf()
        }

    private fun getInAppTipIds(prefs: android.content.SharedPreferences): Set<String> =
        loadInAppJsonObjects(prefs, com.google.gson.Gson())
            .mapNotNull { obj -> obj.get("tipId")?.takeIf { it.isJsonPrimitive }?.asString?.trim() }
            .filter { it.isNotEmpty() }
            .toSet()

    private fun getNotifiedTipIds(prefs: android.content.SharedPreferences): Set<String> {
        val json = prefs.getString(KEY_NOTIFIED_TIP_IDS_JSON, "[]") ?: "[]"
        return parseStringSetFromJson(json)
    }

    private fun parseStringSetFromJson(json: String): Set<String> =
        try {
            val arr = com.google.gson.Gson().fromJson(json, JsonArray::class.java) ?: JsonArray()
            (0 until arr.size())
                .mapNotNull { idx -> arr.get(idx)?.takeIf { it.isJsonPrimitive }?.asString?.trim() }
                .filter { it.isNotEmpty() }
                .toSet()
        } catch (_: Exception) {
            emptySet()
        }

    private fun saveNotifiedTipIds(prefs: android.content.SharedPreferences, ids: Set<String>) {
        val trimmed = ids.toList().take(MAX_NOTIFIED_TIP_IDS)
        prefs.edit().putString(KEY_NOTIFIED_TIP_IDS_JSON, com.google.gson.Gson().toJson(trimmed)).apply()
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
            loadInAppJsonObjects(prefs, com.google.gson.Gson()).mapNotNull { obj ->
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
            .edit().putString(KEY_ITEMS_JSON, "[]").apply()
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
            .edit().putLong(KEY_LAST_VIEWED_MILLIS, viewedAt).apply()
    }
}
