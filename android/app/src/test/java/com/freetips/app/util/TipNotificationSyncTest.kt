package com.freetips.app.util

import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class TipNotificationSyncTest {

    private lateinit var context: android.content.Context

    @Before
    fun setUp() {
        context = android.app.Application()
        context.getSharedPreferences("balance_notification", android.content.Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
    }

    @Test
    fun first_sync_bootstrap_marks_without_notifications() {
        TipNotificationSync.syncTips(
            context,
            listOf(
                TipNotificationSync.Tip(
                    id = "tip-a",
                    amountKop = 10_000,
                    feeKop = 250,
                    tipNetKop = 9_750,
                    createdAtMillis = System.currentTimeMillis(),
                )
            )
        )

        // На первом запуске пуш не должен отправляться, только метка delivered.
        val store = TipPushMarkStore.load(context)
        assertEquals(true, store.isDelivered("tip-a"))
        assertEquals(0, BalanceNotificationHelper.getInAppList(context).size)
    }

    @Test
    fun second_sync_does_not_duplicate_same_tip() {
        val now = System.currentTimeMillis()
        val tip = TipNotificationSync.Tip(
            id = "tip-b",
            amountKop = 10_000,
            feeKop = 250,
            tipNetKop = 9_750,
            createdAtMillis = now,
        )

        // bootstrap (без push)
        TipNotificationSync.syncTips(context, listOf(tip))
        // повторный sync того же tip-id
        TipNotificationSync.syncTips(context, listOf(tip))

        assertEquals(0, BalanceNotificationHelper.getInAppList(context).size)
    }
}
