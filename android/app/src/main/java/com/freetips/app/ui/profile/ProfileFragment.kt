package com.freetips.app.ui.profile

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.freetips.app.ApiKeyEntryActivity
import com.freetips.app.BuildConfig
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
        binding.swipeRefresh.setColorSchemeResources(R.color.primary)
        binding.swipeRefresh.setOnRefreshListener { loadProfile() }
        binding.versionText.text = getString(R.string.profile_app_version_fmt, BuildConfig.VERSION_NAME)
        loadProfile()
        binding.btnLogout.setOnClickListener {
            SecurePrefs(requireContext()).clear()
            startActivity(Intent(requireContext(), ApiKeyEntryActivity::class.java).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK })
            activity?.finish()
        }
    }

    private fun loadProfile() {
        val b = _binding ?: return
        val ctx = context ?: return
        val prefs = SecurePrefs(ctx)
        val apiKey = prefs.apiKey ?: run {
            b.swipeRefresh.isRefreshing = false
            return
        }
        ApiClient(apiKey, prefs.effectiveBaseUrl).getProfile().enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread {
                    val ui = _binding ?: return@runOnUiThread
                    ui.swipeRefresh.isRefreshing = false
                    ui.errorText.visibility = View.VISIBLE
                    ui.errorText.text = "Ошибка загрузки"
                }
            }
            override fun onResponse(call: Call, response: Response) {
                val body = response.body?.string() ?: ""
                val code = response.code
                val ok = response.isSuccessful
                activity?.runOnUiThread {
                    val ui = _binding ?: return@runOnUiThread
                    ui.swipeRefresh.isRefreshing = false
                    if (ok) {
                        try {
                            val data = Gson().fromJson(body, ProfileData::class.java)
                            ui.loginText.text = "Логин: ${data.login ?: "—"}"
                            ui.emailText.text = data.email ?: "—"
                            ui.fullNameText.text = data.fullName ?: "—"
                        } catch (_: Exception) {}
                    } else {
                        ui.errorText.visibility = View.VISIBLE
                        ui.errorText.text = "Ошибка $code"
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
