package com.freetips.app.data

import android.content.Context
import android.content.SharedPreferences
import com.freetips.app.BuildConfig
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

private const val PREFS_NAME = "freetips_secure"
private const val KEY_API_KEY = "api_key"
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

    /** URL for API requests. Always BuildConfig.BASE_URL (normalized). Not stored or visible in app. */
    val effectiveBaseUrl: String
        get() {
            val raw = BuildConfig.BASE_URL.trim().removeSuffix("/")
            return when {
                raw.startsWith("http://") || raw.startsWith("https://") -> raw
                raw.isNotBlank() -> "https://$raw"
                else -> "https://free-tips.ru"
            }
        }

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
