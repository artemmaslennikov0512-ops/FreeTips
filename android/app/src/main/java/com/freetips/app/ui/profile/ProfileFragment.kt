package com.freetips.app.ui.profile

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.freetips.app.ApiKeyEntryActivity
import com.freetips.app.R
import com.freetips.app.data.ApiClient
import com.freetips.app.data.SecurePrefs
import com.freetips.app.databinding.FragmentProfileBinding
import com.google.gson.Gson
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Response
import java.io.IOException

data class ProfileData(val login: String?, val email: String?, val fullName: String?)

class ProfileFragment : Fragment() {

    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val prefs = SecurePrefs(requireContext())
        binding.inputBaseUrl.setText(prefs.baseUrl ?: com.freetips.app.BuildConfig.BASE_URL)
        binding.btnSaveUrl.setOnClickListener {
            val raw = binding.inputBaseUrl.text?.toString()?.trim()
            val normalized = when {
                raw.isNullOrBlank() || !raw.startsWith("http") -> null
                raw.endsWith("/") -> raw.dropLast(1)
                else -> raw
            }
            prefs.baseUrl = normalized
            Toast.makeText(requireContext(), getString(R.string.profile_address_saved), Toast.LENGTH_SHORT).show()
        }
        binding.swipeRefresh.setColorSchemeResources(R.color.primary)
        binding.swipeRefresh.setOnRefreshListener { loadProfile() }
        loadProfile()
        binding.btnLogout.setOnClickListener {
            SecurePrefs(requireContext()).clear()
            startActivity(Intent(requireContext(), ApiKeyEntryActivity::class.java).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK })
            activity?.finish()
        }
    }

    private fun loadProfile() {
        val prefs = SecurePrefs(requireContext())
        val apiKey = prefs.apiKey ?: run {
            binding.swipeRefresh.isRefreshing = false
            return
        }
        ApiClient(apiKey, prefs.effectiveBaseUrl).getProfile().enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread {
                    binding.swipeRefresh.isRefreshing = false
                    binding.errorText.visibility = View.VISIBLE
                    binding.errorText.text = "Ошибка загрузки"
                }
            }
            override fun onResponse(call: Call, response: Response) {
                activity?.runOnUiThread {
                    binding.swipeRefresh.isRefreshing = false
                    if (response.isSuccessful) {
                        val body = response.body?.string() ?: ""
                        try {
                            val data = Gson().fromJson(body, ProfileData::class.java)
                            binding.loginText.text = "Логин: ${data.login ?: "—"}"
                            binding.emailText.text = data.email ?: "—"
                            binding.fullNameText.text = data.fullName ?: "—"
                        } catch (_: Exception) {}
                    } else {
                        binding.errorText.visibility = View.VISIBLE
                        binding.errorText.text = "Ошибка ${response.code}"
                    }
                }
            }
        })
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}
