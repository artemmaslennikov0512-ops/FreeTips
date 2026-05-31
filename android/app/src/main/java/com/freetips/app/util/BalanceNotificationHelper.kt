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
import java.time.Instant

/**
 * Уведомления о пополнении: один SUCCESS tip — один пуш и одна запись в колокольчике.
 * Сумма в пуше — amountKop (сколько заплатил гость, напр. 100 ₽).
 * В истории операций показывается tipNetKop (нетто после комиссии, напр. 97,50 ₽).
 */
object BalanceNotificationHelper {

    /** После доставки пуша + записи в колокольчик (для обновления badge в UI). */
    const val ACTION_TIP_NOTIFICATION_DELIVERED = "com.freetips.app.TIP_NOTIFICATION_DELIVERED"

    private const val PREFS_NAME = "balance_notification"
    private const val KEY_LAST_GUEST_PAID_TIPS_KOP = "last_guest_paid_tips_kop"
    private const val KEY_LAST_BALANCE_KOP = "last_balance_kop"
    private const val KEY_ITEMS_JSON = "notification_items_json"
    private const val KEY_LAST_VIEWED_MILLIS = "last_viewed_millis"
    /** tip-id, по которым реально отправили пуш в шторку. */
    private const val KEY_PUSHED_TIP_IDS_JSON = "pushed_tip_ids_json"
    /** tip-id, известные при первом запуске — без пуша (история до установки). */
    private const val KEY_SAMPLED_TIP_IDS_JSON = "sampled_tip_ids_json"
    /** @deprecated миграция v6 */
    private const val KEY_NOTIFIED_TIP_IDS_JSON = "notified_tip_ids_json"
    /** @deprecated читается только при миграции v5 */
    private const val KEY_SEEN_TIP_IDS_JSON = "seen_tip_ids_json"
    private const val KEY_BASIS_SCHEMA = "notify_basis_schema"
    private const val KEY_TIPS_BOOTSTRAP_DONE = "tips_bootstrap_done"
    private const val KEY_V5_MIGRATED = "notify_v5_migrated"
    private const val KEY_V6_MIGRATED = "notify_v6_migrated"
    private const val KEY_LEGACY_RECONCILE_DONE = "notify_legacy_reconcile_done"
    /** Время последней успешной синхронизации /api/operations (ISO-8601 для query since). */
    private const val KEY_LAST_OPS_SYNC_MILLIS = "last_ops_sync_millis"
    private const val SCHEMA_GUEST_PAID_ONLY = 2
    private const val SCHEMA_TIP_ID_DEDUP = 5
    private const val MAX_ITEMS = 100
    private const val MAX_NOTIFIED_TIP_IDS = 500
    private const val NOTIFICATION_ID_BASE = 10_000
    /** Перекрытие при запросе since — подтягиваем операции чуть раньше последней синхронизации. */
    private const val SINCE_OVERLAP_MS = 120_000L

    private val lock = Any()

    /** In-memory кэш tip-id: защита от гонки SharedPreferences.apply() между потоками. */
    private var pushedIdsCache: LinkedHashSet<String>? = null
    private var sampledIdsCache: LinkedHashSet<String>? = null
    private var idsCacheLoaded = false

    data class TipOperation(
        val id: String,
        val amountKop: Int,
        val feeKop: Int = 0,
        val tipNetKop: Int? = null,
        val status: String,
        val createdAtMillis: Long = System.currentTimeMillis(),
    )

    /**
     * ISO-8601 для GET /api/operations?since=… с перекрытием, чтобы не терять операции на границе.
     * null — bootstrap ещё не завершён, нужен полный список.
     */
    fun sinceIsoForNextFetch(context: Context): String? {
        synchronized(lock) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            if (!prefs.getBoolean(KEY_TIPS_BOOTSTRAP_DONE, false)) return null
            val lastMs = prefs.getLong(KEY_LAST_OPS_SYNC_MILLIS, 0L)
            if (lastMs <= 0L) return null
            val sinceMs = (lastMs - SINCE_OVERLAP_MS).coerceAtLeast(0L)
            return Instant.ofEpochMilli(sinceMs).toString()
        }
    }

    private fun markOpsSyncCompleted(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_LAST_OPS_SYNC_MILLIS, System.currentTimeMillis())
            .commit()
    }

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
            migrateToV6IfNeeded(prefs)
            migrateToV5IfNeeded(prefs)

            if (prefs.getInt(KEY_BASIS_SCHEMA, 0) < SCHEMA_GUEST_PAID_ONLY) {
                prefs.edit()
                    .putInt(KEY_LAST_GUEST_PAID_TIPS_KOP, totalGuestPaidTipsKop.coerceAtLeast(0))
                    .putInt(KEY_BASIS_SCHEMA, SCHEMA_GUEST_PAID_ONLY)
                    .commit()
                return
            }

            val lastBasis = prefs.getInt(KEY_LAST_GUEST_PAID_TIPS_KOP, -1)
            val basis = totalGuestPaidTipsKop.coerceAtLeast(0)

            if (lastBasis < 0) {
                prefs.edit()
                    .putInt(KEY_LAST_GUEST_PAID_TIPS_KOP, basis)
                    .putInt(KEY_LAST_BALANCE_KOP, balanceKop)
                    .commit()
                return
            }

            prefs.edit()
                .putInt(KEY_LAST_GUEST_PAID_TIPS_KOP, basis)
                .putInt(KEY_LAST_BALANCE_KOP, balanceKop)
                .commit()
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
            migrateToV6IfNeeded(prefs)
            migrateToV5IfNeeded(prefs)
            ensureIdsCacheLoaded(prefs)

            val normalized = tips
                .asSequence()
                .filter { it.status == "SUCCESS" }
                .filter { it.id.isNotBlank() && it.amountKop > 0 }
                .distinctBy { it.id }
                .toList()
            if (normalized.isEmpty()) return

            val pushedIds = pushedIdsCache!!
            val sampledIds = sampledIdsCache!!

            if (!prefs.getBoolean(KEY_TIPS_BOOTSTRAP_DONE, false)) {
                for (tip in normalized) {
                    sampledIds.add(tip.id)
                }
                saveSampledTipIds(prefs, sampledIds)
                prefs.edit()
                    .putBoolean(KEY_TIPS_BOOTSTRAP_DONE, true)
                    .putInt(KEY_BASIS_SCHEMA, SCHEMA_TIP_ID_DEDUP)
                    .commit()
                markOpsSyncCompleted(context)
                return
            }

            if (!prefs.getBoolean(KEY_LEGACY_RECONCILE_DONE, false)) {
                attachLegacyInAppTipIds(prefs, normalized, pushedIds, sampledIds)
                prefs.edit().putBoolean(KEY_LEGACY_RECONCILE_DONE, true).commit()
            }

            // Колокольчик = уже доставлено: tip-id из inbox блокирует повторный пуш при любом числе опросов.
            reconcileInboxIntoPushedIds(prefs, pushedIds)
            backfillInboxForAlreadyPushedTips(context, prefs, pushedIds, normalized)

            val skipIds = pushedIds + sampledIds
            val pending = normalized
                .filter { !skipIds.contains(it.id) }
                .sortedBy { it.createdAtMillis }

            for (tip in pending) {
                val displayKop = displayKopForPush(tip)
                if (displayKop <= 0) {
                    sampledIds.add(tip.id)
                    continue
                }
                deliverTipNotification(context, prefs, tip, displayKop, pushedIds)
            }

            savePushedTipIds(prefs, pushedIds, getInAppTipIds(prefs))
            saveSampledTipIds(prefs, sampledIds)
            markOpsSyncCompleted(context)
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
        pushedIds: LinkedHashSet<String>,
    ) {
        if (pushedIds.contains(tip.id)) return
        if (isTipAlreadyInInbox(prefs, tip.id)) {
            pushedIds.add(tip.id)
            savePushedTipIds(prefs, pushedIds, getInAppTipIds(prefs))
            return
        }
        if (attachLegacyInboxEntryIfMatches(prefs, tip)) {
            pushedIds.add(tip.id)
            savePushedTipIds(prefs, pushedIds, getInAppTipIds(prefs))
            return
        }
        if (!pushedIds.add(tip.id)) return
        // 1) id на диск — блокирует повторный пуш при параллельных опросах.
        savePushedTipIds(prefs, pushedIds, getInAppTipIds(prefs))

        val rubText = formatKopToRub(displayKop)
        val title = context.getString(R.string.notification_topup_title)
        val text = context.getString(R.string.notification_topup_body, rubText)
        // 2) Колокольчик на диск ДО пуша — после перезапуска reconcile найдёт tip-id.
        if (!appendInAppInboxSilent(prefs, tip.id, displayKop, text, tip.createdAtMillis)) {
            return
        }
        // 3) Системный пуш — только после успешного сохранения в колокольчик.
        showSystemNotification(context, title, text, tip.id)
        context.sendBroadcast(
            Intent(ACTION_TIP_NOTIFICATION_DELIVERED).setPackage(context.packageName),
        )
    }

    /**
     * Если пуш уже был (id в pushedIds), но запись в колокольчик не сохранилась (краш/kill) —
     * восстанавливаем inbox без повторного notify().
     */
    private fun backfillInboxForAlreadyPushedTips(
        context: Context,
        prefs: android.content.SharedPreferences,
        pushedIds: LinkedHashSet<String>,
        normalized: List<TipOperation>,
    ) {
        val inboxIds = getInAppTipIds(prefs)
        for (tip in normalized) {
            if (!pushedIds.contains(tip.id) || inboxIds.contains(tip.id)) continue
            val displayKop = displayKopForPush(tip)
            if (displayKop <= 0) continue
            val text = context.getString(R.string.notification_topup_body, formatKopToRub(displayKop))
            appendInAppInboxSilent(prefs, tip.id, displayKop, text, tip.createdAtMillis)
        }
    }

    /** tip-id из колокольчика → pushedIds, чтобы повторный опрос не слал пуш снова. */
    private fun reconcileInboxIntoPushedIds(
        prefs: android.content.SharedPreferences,
        pushedIds: LinkedHashSet<String>,
    ) {
        val inboxIds = getInAppTipIds(prefs)
        if (inboxIds.isEmpty()) return
        val before = pushedIds.size
        pushedIds.addAll(inboxIds)
        if (pushedIds.size != before) {
            savePushedTipIds(prefs, pushedIds, inboxIds)
        }
    }

    private fun isTipAlreadyInInbox(prefs: android.content.SharedPreferences, tipId: String): Boolean =
        getInAppTipIds(prefs).contains(tipId)

    /** Запись в колокольчике без tipId — привязываем id и не шлём повторный пуш. */
    private fun attachLegacyInboxEntryIfMatches(
        prefs: android.content.SharedPreferences,
        tip: TipOperation,
    ): Boolean {
        val gson = com.google.gson.Gson()
        val list = loadInAppJsonObjects(prefs, gson)
        val displayKop = displayKopForPush(tip)
        val legacyIdx = list.indexOfFirst { obj ->
            val existingId = obj.get("tipId")?.takeIf { it.isJsonPrimitive }?.asString?.trim().orEmpty()
            if (existingId.isNotEmpty()) return@indexOfFirst false
            val existingAmount = obj.get("amountKop")?.takeIf { it.isJsonPrimitive }?.asInt ?: return@indexOfFirst false
            val existingTime = obj.get("time")?.takeIf { it.isJsonPrimitive }?.asLong ?: return@indexOfFirst false
            val netKop = tip.tipNetKop ?: (tip.amountKop - tip.feeKop.coerceAtLeast(0)).coerceAtLeast(0)
            (existingAmount == displayKop || existingAmount == netKop) &&
                kotlin.math.abs(existingTime - tip.createdAtMillis) < 120_000L
        }
        if (legacyIdx < 0) return false
        list[legacyIdx].addProperty("tipId", tip.id)
        prefs.edit().putString(KEY_ITEMS_JSON, gson.toJson(list)).commit()
        return true
    }

    /** Только проставляет tipId в старых записях колокольчика и помечает их pushed. */
    private fun attachLegacyInAppTipIds(
        prefs: android.content.SharedPreferences,
        normalized: List<TipOperation>,
        pushedIds: LinkedHashSet<String>,
        sampledIds: LinkedHashSet<String>,
    ) {
        val gson = com.google.gson.Gson()
        val list = loadInAppJsonObjects(prefs, gson)
        if (list.isEmpty()) return

        val unmatchedTips = normalized.sortedByDescending { it.createdAtMillis }.toMutableList()
        var changed = false
        for (obj in list) {
            val existingTipId = obj.get("tipId")?.takeIf { it.isJsonPrimitive }?.asString?.trim().orEmpty()
            if (existingTipId.isNotEmpty()) {
                pushedIds.add(existingTipId)
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
            pushedIds.add(match.id)
            changed = true
        }
        if (changed) {
            prefs.edit().putString(KEY_ITEMS_JSON, gson.toJson(list)).commit()
        }
        savePushedTipIds(prefs, pushedIds, getInAppTipIds(prefs))
        saveSampledTipIds(prefs, sampledIds)
    }

    private fun ensureIdsCacheLoaded(prefs: android.content.SharedPreferences) {
        if (idsCacheLoaded) return
        pushedIdsCache = readOrderedIdSet(prefs.getString(KEY_PUSHED_TIP_IDS_JSON, "[]") ?: "[]")
        sampledIdsCache = readOrderedIdSet(prefs.getString(KEY_SAMPLED_TIP_IDS_JSON, "[]") ?: "[]")
        idsCacheLoaded = true
    }

    private fun migrateToV6IfNeeded(prefs: android.content.SharedPreferences) {
        if (prefs.getBoolean(KEY_V6_MIGRATED, false)) return
        ensureIdsCacheLoaded(prefs)
        val pushed = pushedIdsCache!!
        pushed.addAll(getInAppTipIds(prefs))
        savePushedTipIds(prefs, pushed, getInAppTipIds(prefs))
        saveSampledTipIds(prefs, linkedSetOf())
        prefs.edit()
            .remove(KEY_NOTIFIED_TIP_IDS_JSON)
            .putBoolean(KEY_V6_MIGRATED, true)
            .putBoolean(KEY_LEGACY_RECONCILE_DONE, false)
            .commit()
    }

    private fun migrateToV5IfNeeded(prefs: android.content.SharedPreferences) {
        if (prefs.getBoolean(KEY_V5_MIGRATED, false)) return

        ensureIdsCacheLoaded(prefs)
        val pushed = pushedIdsCache!!
        pushed.addAll(getInAppTipIds(prefs))
        savePushedTipIds(prefs, pushed, getInAppTipIds(prefs))
        prefs.edit()
            .remove(KEY_SEEN_TIP_IDS_JSON)
            .putBoolean(KEY_V5_MIGRATED, true)
            .putBoolean(KEY_TIPS_BOOTSTRAP_DONE, prefs.getInt(KEY_BASIS_SCHEMA, 0) >= SCHEMA_GUEST_PAID_ONLY)
            .putInt(KEY_BASIS_SCHEMA, SCHEMA_TIP_ID_DEDUP)
            .commit()
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

    /** Локальный inbox колокольчика — без системного пуша. @return true если запись есть на диске. */
    private fun appendInAppInboxSilent(
        prefs: android.content.SharedPreferences,
        tipId: String,
        amountKop: Int,
        displayText: String,
        timeMillis: Long,
    ): Boolean {
        val gson = com.google.gson.Gson()
        val list = loadInAppJsonObjects(prefs, gson)
        val existingIdx = list.indexOfFirst { it.get("tipId")?.asString == tipId }
        if (existingIdx >= 0) return true

        // Старая запись без tipId — привязываем tipId вместо дубля.
        val legacyIdx = list.indexOfFirst { obj ->
            val existingId = obj.get("tipId")?.takeIf { it.isJsonPrimitive }?.asString?.trim().orEmpty()
            if (existingId.isNotEmpty()) return@indexOfFirst false
            val existingAmount = obj.get("amountKop")?.takeIf { it.isJsonPrimitive }?.asInt ?: return@indexOfFirst false
            val existingTime = obj.get("time")?.takeIf { it.isJsonPrimitive }?.asLong ?: return@indexOfFirst false
            existingAmount == amountKop && kotlin.math.abs(existingTime - timeMillis) < 120_000L
        }
        if (legacyIdx >= 0) {
            list[legacyIdx].addProperty("tipId", tipId)
            return prefs.edit().putString(KEY_ITEMS_JSON, gson.toJson(list)).commit()
        }

        val obj = JsonObject().apply {
            addProperty("tipId", tipId)
            addProperty("amountKop", amountKop)
            addProperty("text", displayText)
            addProperty("time", timeMillis)
        }
        list.add(0, obj)
        while (list.size > MAX_ITEMS) list.removeAt(list.size - 1)
        return prefs.edit().putString(KEY_ITEMS_JSON, gson.toJson(list)).commit()
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

    private fun readOrderedIdSet(json: String): LinkedHashSet<String> {
        val result = linkedSetOf<String>()
        try {
            val arr = com.google.gson.Gson().fromJson(json, JsonArray::class.java) ?: JsonArray()
            for (idx in 0 until arr.size()) {
                val id = arr.get(idx)?.takeIf { it.isJsonPrimitive }?.asString?.trim().orEmpty()
                if (id.isNotEmpty()) result.add(id)
            }
        } catch (_: Exception) { }
        return result
    }

    private fun savePushedTipIds(
        prefs: android.content.SharedPreferences,
        ids: LinkedHashSet<String>,
        protectFromTrim: Set<String> = emptySet(),
    ) {
        trimOldest(ids, protectFromTrim)
        pushedIdsCache = ids
        prefs.edit().putString(KEY_PUSHED_TIP_IDS_JSON, com.google.gson.Gson().toJson(ids.toList())).commit()
    }

    private fun saveSampledTipIds(prefs: android.content.SharedPreferences, ids: LinkedHashSet<String>) {
        trimOldest(ids)
        sampledIdsCache = ids
        prefs.edit().putString(KEY_SAMPLED_TIP_IDS_JSON, com.google.gson.Gson().toJson(ids.toList())).commit()
    }

    private fun trimOldest(ids: LinkedHashSet<String>, protect: Set<String> = emptySet()) {
        while (ids.size > MAX_NOTIFIED_TIP_IDS) {
            val oldest = ids.firstOrNull { it !in protect } ?: break
            ids.remove(oldest)
        }
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
