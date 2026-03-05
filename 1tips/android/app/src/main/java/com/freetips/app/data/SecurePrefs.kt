package com.freetips.app.data

import android.content.Context
import android.content.SharedPreferences
import com.freetips.app.BuildConfig
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

private const val PREFS_NAME = "freetips_secure"
private const val KEY_API_KEY = "api_key"
private const val KEY_BASE_URL = "base_url"
private const val KEY_HAS_SUCCESSFUL_LOGIN = "has_successful_login"

class SecurePrefs(context: Context) {

    private val prefs: SharedPreferences = try {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (_: Throwable) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    var apiKey: String?
        get() = prefs.getString(KEY_API_KEY, null)?.takeIf { it.isNotBlank() }
        set(value) {
            prefs.edit().putString(KEY_API_KEY, value?.takeIf { it.isNotBlank() }).apply()
        }

    /** Saved server URL. If null or blank, effectiveBaseUrl uses BuildConfig.BASE_URL. */
    var baseUrl: String?
        get() {
            val raw = prefs.getString(KEY_BASE_URL, null)?.trim()?.takeIf { it.isNotBlank() } ?: return null
            if (looksLikeApiKey(raw)) {
                prefs.edit().putString(KEY_BASE_URL, null).apply()
                return null
            }
            return raw
        }
        set(value) {
            val v = value?.trim()?.takeIf { it.isNotBlank() }
            if (v != null && looksLikeApiKey(v)) return
            prefs.edit().putString(KEY_BASE_URL, v).apply()
        }

    /** URL for API requests: saved baseUrl or BuildConfig default. Always has http(s) scheme and no trailing slash. */
    val effectiveBaseUrl: String
        get() {
            val saved = baseUrl?.trim()?.takeIf { it.isNotBlank() }
            val raw = when {
                saved == null -> BuildConfig.BASE_URL
                looksLikeApiKey(saved) -> BuildConfig.BASE_URL
                else -> saved
            }
            val withoutSlash = raw.removeSuffix("/").trim()
            val withScheme = when {
                withoutSlash.startsWith("http://") || withoutSlash.startsWith("https://") -> withoutSlash
                else -> "https://$withoutSlash"
            }
            return withScheme
        }

    private fun looksLikeApiKey(s: String): Boolean {
        val clean = s.removePrefix("http://").removePrefix("https://").trim()
        if (clean.isEmpty()) return true
        if (clean.contains(".")) return false
        if (clean.length in 32..128 && clean.all { it.isLetterOrDigit() || it == '-' || it == '_' })
            return true
        return false
    }

    fun looksLikeApiKeyPublic(s: String): Boolean = looksLikeApiKey(s)

    /** True only after at least one successful login in this install. Used to allow auto-login on next launch. */
    var hasSuccessfulLoginOnce: Boolean
        get() = prefs.getBoolean(KEY_HAS_SUCCESSFUL_LOGIN, false)
        set(value) {
            prefs.edit().putBoolean(KEY_HAS_SUCCESSFUL_LOGIN, value).apply()
        }

    fun clear() {
        prefs.edit().clear().apply()
    }
}
