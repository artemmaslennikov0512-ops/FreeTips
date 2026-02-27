package com.freetips.app.ui.links

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.freetips.app.R
import com.freetips.app.data.ApiClient
import com.freetips.app.data.SecurePrefs
import com.freetips.app.databinding.FragmentLinksBinding
import com.google.gson.Gson
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Response
import java.io.IOException

data class LinkItem(val id: String, val slug: String, val createdAt: String)

class LinksFragment : Fragment() {

    private var _binding: FragmentLinksBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentLinksBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.swipeRefresh.setColorSchemeResources(R.color.primary)
        binding.swipeRefresh.setOnRefreshListener { loadLinks() }
        loadLinks()
    }

    private fun loadLinks() {
        val prefs = SecurePrefs(requireContext())
        val apiKey = prefs.apiKey ?: run {
            binding.swipeRefresh.isRefreshing = false
            return
        }
        if (!binding.swipeRefresh.isRefreshing) binding.progress.visibility = View.VISIBLE
        binding.errorText.visibility = View.GONE
        val base = prefs.effectiveBaseUrl
        ApiClient(apiKey, base).getLinks().enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread {
                    binding.progress.visibility = View.GONE
                    binding.swipeRefresh.isRefreshing = false
                    binding.qrCard.visibility = View.GONE
                    binding.errorText.visibility = View.VISIBLE
                    binding.errorText.text = "Ошибка загрузки"
                }
            }
            override fun onResponse(call: Call, response: Response) {
                activity?.runOnUiThread {
                    binding.progress.visibility = View.GONE
                    binding.swipeRefresh.isRefreshing = false
                    if (response.isSuccessful) {
                        val body = response.body?.string() ?: ""
                        try {
                            @Suppress("UNCHECKED_CAST")
                            val links = (Gson().fromJson(body, Map::class.java)["links"] as? List<*>)?.map { it as Map<*, *> } ?: emptyList()
                            val sb = StringBuilder()
                            var firstUrl: String? = null
                            links.forEach { m ->
                                val slug = m["slug"]?.toString() ?: ""
                                val url = "${base.removeSuffix("/")}/pay/$slug"
                                if (firstUrl == null) firstUrl = url
                                sb.append("Ссылка для чаевых:\n$url\n\n")
                            }
                            binding.linksList.text = if (sb.isEmpty()) "Нет ссылок" else sb.toString().trim()
                            firstUrl?.let { url ->
                                binding.qrCard.visibility = View.VISIBLE
                                binding.qrImage.setImageBitmap(encodeQrToBitmap(url, 512))
                            } ?: run { binding.qrCard.visibility = View.GONE }
                            binding.linksList.setOnLongClickListener {
                                val firstUrl = sb.toString().trim().lineSequence().firstOrNull { it.startsWith("http") }
                                if (firstUrl != null) {
                                    (requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                                        .setPrimaryClip(ClipData.newPlainText("url", firstUrl))
                                    Toast.makeText(requireContext(), "Ссылка скопирована", Toast.LENGTH_SHORT).show()
                                }
                                true
                            }
                        } catch (_: Exception) {
                            binding.linksList.text = "Нет ссылок"
                            binding.qrCard.visibility = View.GONE
                        }
                    } else {
                        binding.qrCard.visibility = View.GONE
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

    private fun encodeQrToBitmap(content: String, sizePx: Int): Bitmap {
        val writer = QRCodeWriter()
        val hints = mapOf(EncodeHintType.MARGIN to 1)
        val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, sizePx, sizePx, hints)
        val w = bitMatrix.width
        val h = bitMatrix.height
        val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.RGB_565)
        for (x in 0 until w) {
            for (y in 0 until h) {
                bitmap.setPixel(x, y, if (bitMatrix[x, y]) Color.BLACK else Color.WHITE)
            }
        }
        return bitmap
    }
}
