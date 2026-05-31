package com.freetips.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.ColorStateList
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatDelegate
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.widget.ImageViewCompat
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.freetips.app.data.SecurePrefs
import com.freetips.app.worker.BalanceRefreshScheduler
import com.freetips.app.databinding.ActivityMainBinding
import com.freetips.app.ui.notifications.NotificationsBottomSheet
import com.freetips.app.util.AppUpdateChecker
import com.freetips.app.util.BalanceNotificationHelper
import com.google.android.material.badge.BadgeDrawable
import com.google.android.material.badge.BadgeUtils

class MainActivity : AppCompatActivity(), NotificationsBottomSheet.BadgeUpdater {

    private lateinit var binding: ActivityMainBinding
    private var notificationBadge: BadgeDrawable? = null
    private var currentDestinationId: Int = R.id.nav_home
    private var tipDeliveredReceiver: BroadcastReceiver? = null

    private val requestNotificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ -> }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            val prefs = SecurePrefs(this)
            AppCompatDelegate.setDefaultNightMode(
                if (prefs.isLightTheme) AppCompatDelegate.MODE_NIGHT_NO else AppCompatDelegate.MODE_NIGHT_YES
            )
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
            updateThemeNavIcon(SecurePrefs(this).isLightTheme)
            binding.bottomNav.setOnItemSelectedListener { item ->
                if (item.itemId == R.id.nav_theme_toggle) {
                    val securePrefs = SecurePrefs(this)
                    val toLight = !securePrefs.isLightTheme
                    securePrefs.isLightTheme = toLight
                    updateThemeNavIcon(toLight)
                    AppCompatDelegate.setDefaultNightMode(
                        if (toLight) AppCompatDelegate.MODE_NIGHT_NO else AppCompatDelegate.MODE_NIGHT_YES
                    )
                    recreate()
                    true
                } else {
                    androidx.navigation.ui.NavigationUI.onNavDestinationSelected(item, navController)
                }
            }
            navController.addOnDestinationChangedListener { _, destination, _ ->
                currentDestinationId = destination.id
                val isHome = (destination.id == R.id.nav_home)
                binding.headerContainer.visibility = if (isHome) View.VISIBLE else View.GONE
                // На главной — только значок уведомлений на синем фоне, без шапки и логотипа
                binding.headerBar.visibility = if (isHome) View.GONE else View.VISIBLE
                binding.headerLogo.root.visibility = if (isHome) View.GONE else View.VISIBLE
                if (isHome) {
                    binding.headerContentRow.setBackgroundResource(android.R.color.transparent)
                    binding.bellBadgeAnchor.setBackgroundResource(android.R.color.transparent)
                    binding.btnNotifications.setColorFilter(ContextCompat.getColor(this@MainActivity, R.color.primary))
                    (binding.headerContentRow.layoutParams as? ViewGroup.MarginLayoutParams)?.topMargin =
                        resources.getDimensionPixelSize(R.dimen.header_bell_area_top_margin)
                } else {
                    binding.btnNotifications.clearColorFilter()
                    (binding.headerContentRow.layoutParams as? ViewGroup.MarginLayoutParams)?.topMargin = 0
                }
                val selectedItemId =
                    if (destination.id == R.id.nav_theme_toggle) R.id.nav_profile else destination.id
                if (binding.bottomNav.selectedItemId != selectedItemId) {
                    binding.bottomNav.selectedItemId = selectedItemId
                }
            }

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
            AppUpdateChecker.check(this)
        } catch (t: Throwable) {
            try {
                SecurePrefs(this).clear()
            } catch (_: Throwable) {}
            startActivity(Intent(this, ApiKeyEntryActivity::class.java))
            finish()
        }
    }

    override fun onStart() {
        super.onStart()
        registerTipDeliveredReceiver()
    }

    override fun onStop() {
        unregisterTipDeliveredReceiver()
        super.onStop()
    }

    override fun onResume() {
        super.onResume()
        if (::binding.isInitialized) {
            updateThemeNavIcon(SecurePrefs(this).isLightTheme)
            val selectedItemId = if (currentDestinationId == R.id.nav_theme_toggle) R.id.nav_profile else currentDestinationId
            if (binding.bottomNav.selectedItemId != selectedItemId) {
                binding.bottomNav.selectedItemId = selectedItemId
            }
            updateNotificationBadge()
        }
    }

    override fun onNotificationsViewed() {
        updateNotificationBadge()
    }

    private fun registerTipDeliveredReceiver() {
        if (tipDeliveredReceiver != null) return
        tipDeliveredReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action == BalanceNotificationHelper.ACTION_TIP_NOTIFICATION_DELIVERED) {
                    updateNotificationBadge()
                }
            }
        }
        val filter = IntentFilter(BalanceNotificationHelper.ACTION_TIP_NOTIFICATION_DELIVERED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(tipDeliveredReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(tipDeliveredReceiver, filter)
        }
    }

    private fun unregisterTipDeliveredReceiver() {
        tipDeliveredReceiver?.let {
            try { unregisterReceiver(it) } catch (_: Exception) {}
            tipDeliveredReceiver = null
        }
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
            ColorStateList.valueOf(ContextCompat.getColor(this, R.color.logo_ft_dark_blue))
        )
    }

    private fun updateThemeNavIcon(isLightTheme: Boolean) {
        if (!::binding.isInitialized) return
        val menuItem = binding.bottomNav.menu.findItem(R.id.nav_theme_toggle) ?: return
        menuItem.setIcon(if (isLightTheme) R.drawable.ic_nav_theme_light else R.drawable.ic_nav_theme_dark)
    }

}
