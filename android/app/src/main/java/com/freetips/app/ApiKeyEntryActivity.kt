package com.freetips.app

import android.content.Intent
import android.net.Uri
import android.graphics.LinearGradient
import android.graphics.Shader
import android.os.Bundle
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.freetips.app.BuildConfig
import com.freetips.app.data.ApiClient
import com.freetips.app.data.SecurePrefs
import com.freetips.app.databinding.ActivityApiKeyEntryBinding
import okhttp3.Callback
import okhttp3.Response
import java.io.IOException

class ApiKeyEntryActivity : AppCompatActivity() {

    private lateinit var binding: ActivityApiKeyEntryBinding
    private lateinit var prefs: SecurePrefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            binding = ActivityApiKeyEntryBinding.inflate(layoutInflater)
            setContentView(binding.root)
            prefs = SecurePrefs(this)

            applyGradientWhenLaidOut(binding.titleHeading)

            val savedKey = prefs.apiKey
            if (prefs.hasSuccessfulLoginOnce && !savedKey.isNullOrBlank()) {
                binding.inputApiKey.setText(savedKey)
            }

            binding.btnLogin.setOnClickListener {
                val key = binding.inputApiKey.text?.toString()?.trim()
                if (key.isNullOrBlank() || key.length < 16) {
                    binding.errorText.visibility = View.VISIBLE
                    binding.errorText.text = "Введите API-ключ из личного кабинета (не короче 16 символов)"
                    return@setOnClickListener
                }
                binding.errorText.visibility = View.GONE
                validateAndGo(key)
            }

            binding.linkDownloadApp.setOnClickListener {
                val url = "${BuildConfig.BASE_URL.trimEnd('/')}/freetips.apk"
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
            }

            if (prefs.hasSuccessfulLoginOnce && !savedKey.isNullOrBlank()) {
                validateAndGo(savedKey)
            }
        } catch (t: Throwable) {
            android.util.Log.e("ApiKeyEntry", "onCreate", t)
            try {
                setContentView(android.widget.TextView(this).apply {
                    text = "Ошибка запуска: ${t.message}"
                    setPadding(48, 48, 48, 48)
                })
            } catch (_: Throwable) {
                finish()
            }
        }
    }

    private fun applyGradientWhenLaidOut(label: TextView) {
        label.viewTreeObserver.addOnGlobalLayoutListener(object : android.view.ViewTreeObserver.OnGlobalLayoutListener {
            override fun onGlobalLayout() {
                label.viewTreeObserver.removeOnGlobalLayoutListener(this)
                val text = label.text?.toString() ?: return
                if (text.isEmpty()) return
                val textWidth = label.paint.measureText(text)
                if (textWidth <= 0f) return
                val colorWhite = 0xFFFFFFFF.toInt()
                val colorGold = 0xFFC5A572.toInt()
                val colors = intArrayOf(colorWhite, colorGold)
                val positions = floatArrayOf(0f, 0.35f)
                label.paint.shader = LinearGradient(0f, 0f, textWidth, 0f, colors, positions, Shader.TileMode.CLAMP)
                label.invalidate()
            }
        })
    }

    private fun validateAndGo(apiKey: String) {
        binding.progress.visibility = View.VISIBLE
        binding.btnLogin.isEnabled = false

        ApiClient(apiKey, BuildConfig.BASE_URL).validateApiKey().enqueue(object : Callback {
            override fun onFailure(call: okhttp3.Call, e: IOException) {
                runOnUiThread {
                    binding.progress.visibility = View.GONE
                    binding.btnLogin.isEnabled = true
                    binding.errorText.visibility = View.VISIBLE
                    binding.errorText.text = "Нет связи с сервером. Проверьте интернет."
                }
            }

            override fun onResponse(call: okhttp3.Call, response: Response) {
                val code = response.code
                val success = response.isSuccessful
                response.body?.string()
                runOnUiThread {
                    try {
                        if (isFinishing || isDestroyed) return@runOnUiThread
                        binding.progress.visibility = View.GONE
                        binding.btnLogin.isEnabled = true
                        if (success) {
                            try {
                                prefs.apiKey = apiKey
                                prefs.hasSuccessfulLoginOnce = true
                            } catch (e: Throwable) {
                                binding.errorText.visibility = View.VISIBLE
                                binding.errorText.text = "Ошибка сохранения: ${e.message}"
                                return@runOnUiThread
                            }
                            if (!isFinishing && !isDestroyed) {
                                Toast.makeText(this@ApiKeyEntryActivity, getString(R.string.login_success), Toast.LENGTH_SHORT).show()
                                startActivity(Intent(this@ApiKeyEntryActivity, MainActivity::class.java))
                                finish()
                            }
                        } else {
                            binding.errorText.visibility = View.VISIBLE
                            binding.errorText.text = when (code) {
                                401 -> "Неверный API-ключ"
                                403 -> "Доступ ограничен"
                                else -> "Ошибка входа ($code)"
                            }
                        }
                    } catch (e: Throwable) {
                        try {
                            if (!isFinishing && ::binding.isInitialized) {
                                binding.errorText.visibility = View.VISIBLE
                                binding.errorText.text = "Ошибка: ${e.javaClass.simpleName}"
                            }
                        } catch (_: Throwable) {}
                    }
                }
            }
        })
    }
}
