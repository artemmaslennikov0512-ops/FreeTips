package com.freetips.app.data

import com.freetips.app.BuildConfig
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.Call
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class ApiClient(private val apiKey: String, baseUrl: String = BuildConfig.BASE_URL) {

    private val baseUrl: String = run {
        val raw = baseUrl.trim().removeSuffix("/")
        if (raw.startsWith("http://") || raw.startsWith("https://")) raw else "https://$raw"
    }
    private val gson = Gson()

    private fun newRequest(url: String, block: Request.Builder.() -> Request.Builder): Request =
        Request.Builder()
            .url(url)
            .addHeader("X-API-Key", apiKey)
            .addHeader("Content-Type", "application/json")
            .run(block)
            .build()

    fun getProfile(): Call =
        sharedClient.newCall(newRequest("$baseUrl/api/profile") { get() })

    fun getPayouts(): Call =
        sharedClient.newCall(newRequest("$baseUrl/api/payouts") { get() })

    fun postPayout(amountKop: Long, details: String, recipientName: String? = null): Call {
        val body = buildMap {
            put("amountKop", amountKop)
            put("details", details)
            recipientName?.let { put("recipientName", it) }
        }
        return sharedClient.newCall(
            newRequest("$baseUrl/api/payouts") {
                post(gson.toJson(body).toRequestBody("application/json".toMediaType()))
            }
        )
    }

    fun getTransactions(limit: Int = 20, offset: Int = 0): Call =
        sharedClient.newCall(
            newRequest("$baseUrl/api/transactions?limit=$limit&offset=$offset") { get() }
        )

    /** Unified operations (tips + payouts) for history. [since] — ISO-8601, только операции после указанного времени. */
    fun getOperations(limit: Int = 50, offset: Int = 0, since: String? = null): Call {
        val sinceParam = since?.trim()?.takeIf { it.isNotEmpty() }?.let { "&since=${java.net.URLEncoder.encode(it, Charsets.UTF_8.name())}" } ?: ""
        return sharedClient.newCall(
            newRequest("$baseUrl/api/operations?limit=$limit&offset=$offset$sinceParam") { get() }
        )
    }

    fun getLinks(): Call =
        sharedClient.newCall(newRequest("$baseUrl/api/links") { get() })

    /** Atomic server-side claim: only first caller gets claimed=true for user+tipId. */
    fun claimTipPush(tipId: String): Call {
        val body = mapOf("tipId" to tipId)
        return sharedClient.newCall(
            newRequest("$baseUrl/api/push/tips/claim") {
                post(gson.toJson(body).toRequestBody("application/json".toMediaType()))
            }
        )
    }

    fun validateApiKey(): Call = getProfile()

    companion object {
        /** Single OkHttpClient for connection pooling and faster repeated requests. */
        private val sharedClient = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)
            .build()
        inline fun <reified T> parseBody(json: String): T {
            return Gson().fromJson(json, object : TypeToken<T>() {}.type)
        }
    }
}
