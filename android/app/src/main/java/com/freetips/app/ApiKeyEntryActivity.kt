package com.freetips.app

import android.content.Intent
import android.os.Bundle
import android.view.View
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

            binding.inputBaseUrl.hint = "https://ваш-сайт.ru"
            val urlToShow = if (prefs.hasSuccessfulLoginOnce) {
                val savedUrl = prefs.baseUrl
                if (!savedUrl.isNullOrBlank() && !prefs.looksLikeApiKeyPublic(savedUrl)) savedUrl
                else BuildConfig.BASE_URL.ifBlank { "https://" }
            } else {
                BuildConfig.BASE_URL.ifBlank { "https://" }
            }
            binding.inputBaseUrl.setText(urlToShow)

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
                validateAndGo(getEffectiveBaseUrl(), key)
            }

            binding.btnReset.setOnClickListener {
                prefs.clear()
                binding.inputBaseUrl.setText(BuildConfig.BASE_URL.ifBlank { "https://" })
                binding.inputApiKey.text?.clear()
                binding.errorText.visibility = View.GONE
                binding.progress.visibility = View.GONE
                binding.btnLogin.isEnabled = true
            }

            if (prefs.hasSuccessfulLoginOnce && !savedKey.isNullOrBlank()) {
                validateAndGo(getEffectiveBaseUrl(), savedKey)
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

    /** Нормализует URL для запросов: trim, без завершающего слэша (закон Постеля). */
    private fun normalizeBaseUrl(raw: String): String {
        val trimmed = raw.trim()
        return if (trimmed.endsWith("/")) trimmed.dropLast(1) else trimmed
    }

    private fun getEffectiveBaseUrl(): String {
        val raw = binding.inputBaseUrl.text?.toString()?.trim() ?: ""
        val url = if (raw.startsWith("http")) raw else BuildConfig.BASE_URL
        return normalizeBaseUrl(url)
    }

    private fun validateAndGo(baseUrl: String, apiKey: String) {
        binding.progress.visibility = View.VISIBLE
        binding.btnLogin.isEnabled = false

        ApiClient(apiKey, baseUrl).validateApiKey().enqueue(object : Callback {
            override fun onFailure(call: okhttp3.Call, e: IOException) {
                runOnUiThread {
                    binding.progress.visibility = View.GONE
                    binding.btnLogin.isEnabled = true
                    binding.errorText.visibility = View.VISIBLE
                    binding.errorText.text = "Нет связи с сервером. Проверьте интернет и адрес сервера."
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
                                prefs.baseUrl = baseUrl
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
