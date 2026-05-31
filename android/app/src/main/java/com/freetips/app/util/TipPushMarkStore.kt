package com.freetips.app.util

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.JsonArray

/**
 * Единственный источник отметок «пуш по этой транзакции уже обработан».
 * Только tip-id из БД; без привязки к сумме/времени и без дублирования через inbox.
 */
internal class TipPushMarkStore private constructor(
    private val prefs: SharedPreferences,
) {
    private val gson = Gson()
    private val deliveredIds = linkedSetOf<String>()
    private val pendingIds = linkedSetOf<String>()

    fun isDelivered(tipId: String): Boolean = deliveredIds.contains(tipId)
    fun isPending(tipId: String): Boolean = pendingIds.contains(tipId)

    fun markAllDeliveredSilent(tipIds: Collection<String>) {
        var changed = false
        for (id in tipIds) {
            if (id.isBlank()) continue
            if (deliveredIds.add(id)) changed = true
            if (pendingIds.remove(id)) changed = true
        }
        if (changed) persist()
    }

    /**
     * Ставит pending-отметку до отправки push.
     * @return false — tip уже delivered/pending.
     */
    fun markPending(tipId: String): Boolean {
        if (tipId.isBlank()) return false
        if (deliveredIds.contains(tipId) || pendingIds.contains(tipId)) return false
        pendingIds.add(tipId)
        persist()
        return true
    }

    /** Финализирует успешную доставку: pending -> delivered. */
    fun markDelivered(tipId: String): Boolean {
        if (tipId.isBlank()) return false
        val wasPending = pendingIds.remove(tipId)
        val addedDelivered = deliveredIds.add(tipId)
        if (!wasPending && !addedDelivered) return false
        persist()
        return true
    }

    private fun persist() {
        prefs.edit()
            .putString(KEY_DELIVERED_TIP_IDS, gson.toJson(deliveredIds.toList()))
            .putString(KEY_PENDING_TIP_IDS, gson.toJson(pendingIds.toList()))
            .commit()
    }

    companion object {
        private const val PREFS_NAME = "balance_notification"
        private const val KEY_DELIVERED_TIP_IDS = "delivered_tip_ids_json"
        private const val KEY_PENDING_TIP_IDS = "pending_tip_ids_json"
        private const val KEY_MARK_STORE_MIGRATED = "mark_store_migrated_v8"
        private const val KEY_BOOTSTRAP_DONE = "tips_bootstrap_done"

        /** @deprecated — только для миграции */
        private const val KEY_PUSHED_TIP_IDS_JSON = "pushed_tip_ids_json"
        private const val KEY_SAMPLED_TIP_IDS_JSON = "sampled_tip_ids_json"
        private const val KEY_ITEMS_JSON = "notification_items_json"
        private const val KEY_NOTIFIED_TIP_IDS_JSON = "notified_tip_ids_json"
        private const val KEY_SEEN_TIP_IDS_JSON = "seen_tip_ids_json"

        fun load(context: Context): TipPushMarkStore {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val store = TipPushMarkStore(prefs)
            store.deliveredIds.addAll(readIdSet(prefs.getString(KEY_DELIVERED_TIP_IDS, "[]") ?: "[]"))
            store.pendingIds.addAll(readIdSet(prefs.getString(KEY_PENDING_TIP_IDS, "[]") ?: "[]"))
            if (!prefs.getBoolean(KEY_MARK_STORE_MIGRATED, false)) {
                store.migrateLegacyMarks(prefs)
            }
            return store
        }

        fun isBootstrapDone(context: Context): Boolean =
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getBoolean(KEY_BOOTSTRAP_DONE, false)

        fun setBootstrapDone(context: Context) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(KEY_BOOTSTRAP_DONE, true)
                .commit()
        }

        private fun readIdSet(json: String): LinkedHashSet<String> {
            val result = linkedSetOf<String>()
            try {
                val arr = Gson().fromJson(json, JsonArray::class.java) ?: JsonArray()
                for (idx in 0 until arr.size()) {
                    val id = arr.get(idx)?.takeIf { it.isJsonPrimitive }?.asString?.trim().orEmpty()
                    if (id.isNotEmpty()) result.add(id)
                }
            } catch (_: Exception) { }
            return result
        }

        private fun TipPushMarkStore.migrateLegacyMarks(prefs: SharedPreferences) {
            val legacyKeys = listOf(
                KEY_PUSHED_TIP_IDS_JSON,
                KEY_SAMPLED_TIP_IDS_JSON,
                KEY_NOTIFIED_TIP_IDS_JSON,
                KEY_SEEN_TIP_IDS_JSON,
            )
            for (key in legacyKeys) {
                deliveredIds.addAll(readIdSet(prefs.getString(key, "[]") ?: "[]"))
            }
            deliveredIds.addAll(readInboxTipIds(prefs))
            pendingIds.clear()
            persist()
            val editor = prefs.edit().putBoolean(KEY_MARK_STORE_MIGRATED, true)
            for (key in legacyKeys) {
                editor.remove(key)
            }
            editor.commit()
        }

        private fun readInboxTipIds(prefs: SharedPreferences): Set<String> {
            return try {
                val json = prefs.getString(KEY_ITEMS_JSON, "[]") ?: "[]"
                val arr = Gson().fromJson(json, JsonArray::class.java) ?: JsonArray()
                (0 until arr.size()).mapNotNull { idx ->
                    arr.get(idx)?.asJsonObject
                        ?.get("tipId")?.takeIf { it.isJsonPrimitive }?.asString?.trim()
                        ?.takeIf { it.isNotEmpty() }
                }.toSet()
            } catch (_: Exception) {
                emptySet()
            }
        }
    }
}
