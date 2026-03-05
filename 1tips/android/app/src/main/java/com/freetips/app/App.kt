package com.freetips.app

import android.app.Application
import android.app.NotificationChannel
import android.os.Build
import android.util.Log

class App : Application() {

    override fun onCreate() {
        super.onCreate()
        try {
            createNotificationChannel()
        } catch (t: Throwable) {
            Log.e(TAG, "createNotificationChannel failed", t)
            // Не падаем: уведомления будут без канала до переустановки
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_BALANCE,
            getString(R.string.default_notification_channel_name),
            android.app.NotificationManager.IMPORTANCE_DEFAULT
        )
        getSystemService(android.app.NotificationManager::class.java).createNotificationChannel(channel)
    }

    companion object {
        private const val TAG = "FreeTips.App"
        const val CHANNEL_BALANCE = "freetips_default"
    }
}
