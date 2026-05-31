package com.freetips.app.util

import android.content.Context
import com.freetips.app.data.ApiClient
import com.freetips.app.data.SecurePrefs
import com.google.gson.Gson
import com.google.gson.JsonObject

internal object ServerPushClaimApi {
    private val gson = Gson()

    internal enum class ClaimResult {
        CLAIMED,
        ALREADY_CLAIMED,
        UNAVAILABLE,
        ERROR,
    }

    /**
     * Claims tip push delivery globally on backend.
     * Returns true only for the first successful claimant.
     */
    fun claim(context: Context, tipId: String): ClaimResult {
        if (tipId.isBlank()) return ClaimResult.ERROR
        val appCtx = context.applicationContext
        val prefs = SecurePrefs(appCtx)
        val apiKey = prefs.apiKey?.trim().orEmpty()
        if (apiKey.isEmpty()) return ClaimResult.UNAVAILABLE
        return try {
            ApiClient(apiKey, prefs.effectiveBaseUrl)
                .claimTipPush(tipId)
                .execute()
                .use { response ->
                    if (response.code == 404 || response.code == 405) return ClaimResult.UNAVAILABLE
                    if (!response.isSuccessful) return ClaimResult.ERROR
                    val body = response.body?.string().orEmpty()
                    if (body.isBlank()) return ClaimResult.ERROR
                    val root = gson.fromJson(body, JsonObject::class.java) ?: return ClaimResult.ERROR
                    val claimed = root.get("claimed")?.takeIf { it.isJsonPrimitive }?.asBoolean
                        ?: return ClaimResult.ERROR
                    if (claimed) ClaimResult.CLAIMED else ClaimResult.ALREADY_CLAIMED
                }
        } catch (_: Exception) {
            ClaimResult.ERROR
        }
    }
}
