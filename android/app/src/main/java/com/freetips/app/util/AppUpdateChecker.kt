package com.freetips.app.util

import android.content.Intent
import android.net.Uri
import androidx.appcompat.app.AppCompatActivity
import com.freetips.app.BuildConfig
import com.freetips.app.R
import com.freetips.app.data.SecurePrefs
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

object AppUpdateChecker {

    private val gson = Gson()
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()

    @Volatile
    private var dialogShowing = false

    fun check(activity: AppCompatActivity) {
        if (activity.isFinishing) return
        val baseUrl = SecurePrefs(activity).effectiveBaseUrl
        Thread {
            try {
                val request = Request.Builder()
                    .url("$baseUrl/api/app/version")
                    .get()
                    .build()
                httpClient.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@Thread
                    val body = response.body?.string()?.takeIf { it.isNotBlank() } ?: return@Thread
                    val info = gson.fromJson(body, AppVersionInfo::class.java) ?: return@Thread
                    activity.runOnUiThread {
                        if (!activity.isFinishing) {
                            showUpdateDialogIfNeeded(activity, info)
                        }
                    }
                }
            } catch (_: Exception) {
                // Нет сети или сервер недоступен — тихо пропускаем
            }
        }.start()
    }

    private fun showUpdateDialogIfNeeded(activity: AppCompatActivity, info: AppVersionInfo) {
        if (dialogShowing || activity.isFinishing) return

        val currentCode = BuildConfig.VERSION_CODE
        val serverCode = info.versionCode
        if (serverCode <= currentCode) return

        val prefs = SecurePrefs(activity)
        val forceUpdate = info.minVersionCode > currentCode
        if (!forceUpdate && prefs.updateDismissedVersionCode >= serverCode) return

        dialogShowing = true
        val versionLabel = info.versionName?.takeIf { it.isNotBlank() } ?: serverCode.toString()
        val message = buildString {
            append(activity.getString(R.string.update_available_message, versionLabel))
            info.releaseNotes?.takeIf { it.isNotBlank() }?.let { notes ->
                append("\n\n")
                append(notes)
            }
            if (forceUpdate) {
                append("\n\n")
                append(activity.getString(R.string.update_force_hint))
            }
        }

        val builder = MaterialAlertDialogBuilder(activity)
            .setTitle(R.string.update_available_title)
            .setMessage(message)
            .setCancelable(!forceUpdate)
            .setPositiveButton(R.string.update_button) { _, _ ->
                dialogShowing = false
                openApkUrl(activity, info.apkUrl, baseUrlFallback = SecurePrefs(activity).effectiveBaseUrl)
            }

        if (!forceUpdate) {
            builder.setNegativeButton(R.string.update_later) { _, _ ->
                dialogShowing = false
                prefs.updateDismissedVersionCode = serverCode
            }
        }

        builder.setOnDismissListener {
            dialogShowing = false
        }
        builder.show()
    }

    private fun openApkUrl(activity: AppCompatActivity, apkUrl: String?, baseUrlFallback: String) {
        val url = when {
            !apkUrl.isNullOrBlank() && (apkUrl.startsWith("http://") || apkUrl.startsWith("https://")) -> apkUrl
            !apkUrl.isNullOrBlank() -> {
                val base = baseUrlFallback.trimEnd('/')
                if (apkUrl.startsWith("/")) "$base$apkUrl" else "$base/$apkUrl"
            }
            else -> "${baseUrlFallback.trimEnd('/')}/freetips.apk"
        }
        activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    }

    private data class AppVersionInfo(
        @SerializedName("versionCode") val versionCode: Int = 0,
        @SerializedName("versionName") val versionName: String? = null,
        @SerializedName("apkUrl") val apkUrl: String? = null,
        @SerializedName("minVersionCode") val minVersionCode: Int = 0,
        @SerializedName("releaseNotes") val releaseNotes: String? = null,
    )
}
