package com.freetips.app

import android.content.Intent
import android.content.res.ColorStateList
import android.os.Build
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.widget.ImageViewCompat
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.freetips.app.data.SecurePrefs
import com.freetips.app.worker.BalanceRefreshScheduler
import com.freetips.app.databinding.ActivityMainBinding
import com.freetips.app.ui.notifications.NotificationsBottomSheet
import com.freetips.app.util.BalanceNotificationHelper
import com.google.android.material.badge.BadgeDrawable
import com.google.android.material.badge.BadgeUtils

class MainActivity : AppCompatActivity(), NotificationsBottomSheet.BadgeUpdater {

    private lateinit var binding: ActivityMainBinding
    private var notificationBadge: BadgeDrawable? = null

    private val requestNotificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ -> }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            val prefs = SecurePrefs(this)
            if (prefs.apiKey.isNullOrBlank()) {
                startActivity(Intent(this, ApiKeyEntryActivity::class.java))
                finish()
                return
            }

            binding = ActivityMainBinding.inflate(layoutInflater)
            setContentView(binding.root)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                when (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)) {
                    android.content.pm.PackageManager.PERMISSION_GRANTED -> { }
                    else -> requestNotificationPermission.launch(android.Manifest.permission.POST_NOTIFICATIONS)
                }
            }

            val navHost = supportFragmentManager.findFragmentById(R.id.nav_host_fragment) as? NavHostFragment
            if (navHost == null) {
                startActivity(Intent(this, ApiKeyEntryActivity::class.java))
                finish()
                return
            }
            val navController = navHost.navController
            binding.bottomNav.setupWithNavController(navController)

            notificationBadge = BadgeDrawable.create(this).apply {
                maxCharacterCount = 3
                badgeGravity = BadgeDrawable.TOP_END
                backgroundColor = ContextCompat.getColor(this@MainActivity, R.color.primary)
                badgeTextColor = ContextCompat.getColor(this@MainActivity, R.color.on_primary)
            }
            BadgeUtils.attachBadgeDrawable(notificationBadge!!, binding.bellBadgeAnchor)
            binding.bellBadgeAnchor.setOnClickListener {
                NotificationsBottomSheet().show(supportFragmentManager, NotificationsBottomSheet.TAG)
            }
            updateNotificationBadge()
            BalanceRefreshScheduler.scheduleNext(this)
        } catch (t: Throwable) {
            try {
                SecurePrefs(this).clear()
            } catch (_: Throwable) {}
            startActivity(Intent(this, ApiKeyEntryActivity::class.java))
            finish()
        }
    }

    override fun onResume() {
        super.onResume()
        if (::binding.isInitialized) updateNotificationBadge()
    }

    override fun onNotificationsViewed() {
        updateNotificationBadge()
    }

    private fun updateNotificationBadge() {
        if (!::binding.isInitialized) return
        val count = BalanceNotificationHelper.getUnreadCount(this)
        val badge = notificationBadge ?: return
        if (count > 0) {
            badge.isVisible = true
            badge.number = count
        } else {
            badge.isVisible = false
            badge.clearNumber()
        }
        ImageViewCompat.setImageTintList(
            binding.btnNotifications,
            ColorStateList.valueOf(ContextCompat.getColor(this, R.color.primary))
        )
    }

}
