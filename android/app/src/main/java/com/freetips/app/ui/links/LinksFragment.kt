package com.freetips.app.ui.links

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Shader
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
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
        binding.btnCopyLink.setOnClickListener {
            val url = binding.linksList.text?.toString()
            if (!url.isNullOrBlank() && url.startsWith("http")) {
                (requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                    .setPrimaryClip(ClipData.newPlainText("url", url))
                Toast.makeText(requireContext(), "Ссылка скопирована", Toast.LENGTH_SHORT).show()
            }
        }
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
                    binding.qrTitle.visibility = View.GONE
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
                            var firstUrl: String? = null
                            links.forEach { m ->
                                val slug = m["slug"]?.toString() ?: ""
                                val url = "${base.removeSuffix("/")}/pay/$slug"
                                if (firstUrl == null) firstUrl = url
                            }
                            binding.linksList.text = firstUrl ?: "Нет ссылок"
                            firstUrl?.let { url ->
                                binding.qrTitle.visibility = View.VISIBLE
                                binding.qrCard.visibility = View.VISIBLE
                                binding.qrImage.setImageBitmap(encodeQrToBitmap(requireContext(), url, 512))
                                applyGradientToFreeTipsLabel(binding.qrFreeTipsLabel)
                            } ?: run {
                                binding.qrTitle.visibility = View.GONE
                                binding.qrCard.visibility = View.GONE
                            }
                        } catch (_: Exception) {
                            binding.linksList.text = "Нет ссылок"
                            binding.qrTitle.visibility = View.GONE
                            binding.qrCard.visibility = View.GONE
                        }
                    } else {
                        binding.qrTitle.visibility = View.GONE
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

    private fun encodeQrToBitmap(context: Context, content: String, sizePx: Int): Bitmap {
        val writer = QRCodeWriter()
        val hints = mapOf(EncodeHintType.MARGIN to 2)
        val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, sizePx, sizePx, hints)
        val w = bitMatrix.width
        val h = bitMatrix.height

        val colorBlue = 0xFF0D1B2A.toInt()
        val colorGold = 0xFFC5A572.toInt()
        val gradient = LinearGradient(0f, 0f, w.toFloat(), h.toFloat(), colorBlue, colorGold, Shader.TileMode.CLAMP)
        val gradientBitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val gradCanvas = Canvas(gradientBitmap)
        val gradPaint = Paint().apply { shader = gradient }
        gradCanvas.drawRect(0f, 0f, w.toFloat(), h.toFloat(), gradPaint)

        val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        for (x in 0 until w) {
            for (y in 0 until h) {
                bitmap.setPixel(x, y, if (bitMatrix[x, y]) gradientBitmap.getPixel(x, y) else Color.WHITE)
            }
        }
        gradientBitmap.recycle()
        return bitmap
    }

    private fun applyGradientToFreeTipsLabel(label: TextView) {
        label.viewTreeObserver.addOnGlobalLayoutListener(object : android.view.ViewTreeObserver.OnGlobalLayoutListener {
            override fun onGlobalLayout() {
                label.viewTreeObserver.removeOnGlobalLayoutListener(this)
                val text = label.text?.toString() ?: return
                if (text.isEmpty()) return
                val textWidth = label.paint.measureText(text)
                if (textWidth <= 0f) return
                val colorStart = 0xFF0D1B2A.toInt()
                val colorEnd = 0xFFC5A572.toInt()
                label.paint.shader = LinearGradient(0f, 0f, textWidth, 0f, colorStart, colorEnd, Shader.TileMode.CLAMP)
                label.invalidate()
            }
        })
    }
}
