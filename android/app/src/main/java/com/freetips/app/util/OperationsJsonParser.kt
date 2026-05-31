package com.freetips.app.util

import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonObject

data class ParsedOperation(
    val id: String,
    val type: String,
    val amountKop: Long,
    val feeKop: Long = 0L,
    val tipNetKop: Long? = null,
    val status: String,
    val createdAt: String,
)

data class ParsedOperationsResponse(
    val operations: List<ParsedOperation>,
    val total: Int,
    val rawCount: Int,
)

object OperationsJsonParser {

    fun parse(json: String): ParsedOperationsResponse {
        val root = runCatching { Gson().fromJson(json, JsonObject::class.java) }.getOrNull()
            ?: return ParsedOperationsResponse(emptyList(), 0, 0)
        val total = root.get("total").asLongSafe()?.coerceAtMost(Int.MAX_VALUE.toLong())?.toInt() ?: 0
        val operationsArray = root.getAsJsonArray("operations")
            ?: return ParsedOperationsResponse(emptyList(), total, 0)
        val rawCount = operationsArray.size()
        val operations = (0 until rawCount).mapNotNull { idx ->
            val obj = operationsArray.get(idx)?.takeIf { it.isJsonObject }?.asJsonObject ?: return@mapNotNull null
            parseOperation(obj)
        }
        return ParsedOperationsResponse(operations, total, rawCount)
    }

    private fun parseOperation(obj: JsonObject): ParsedOperation? {
        val id = obj.stringField("id")
        val typeRaw = obj.stringField("type").lowercase()
        val statusRaw = obj.stringField("status").uppercase()
        val createdAt = obj.stringField("createdAt")
        val amountKop = obj.get("amountKop").asLongSafe() ?: return null
        if (id.isEmpty() || createdAt.isEmpty() || amountKop < 0L) return null
        val feeKop = obj.get("feeKop").asLongSafe()?.coerceAtLeast(0L) ?: 0L
        val tipNetKop = obj.get("tipNetKop").asLongSafe()?.takeIf { it > 0L }
        return ParsedOperation(
            id = id,
            type = if (typeRaw == "tip") "tip" else "payout",
            amountKop = amountKop,
            feeKop = feeKop,
            tipNetKop = tipNetKop,
            status = statusRaw.ifEmpty { "UNKNOWN" },
            createdAt = createdAt,
        )
    }

    private fun JsonObject.stringField(name: String): String =
        get(name)?.takeIf { it.isJsonPrimitive }?.asString?.trim().orEmpty()

    private fun JsonElement?.asLongSafe(): Long? {
        if (this == null || !this.isJsonPrimitive) return null
        val p = this.asJsonPrimitive
        return when {
            p.isNumber -> p.asBigDecimal.toLong()
            p.isString -> p.asString.trim().toLongOrNull()
            else -> null
        }
    }
}
