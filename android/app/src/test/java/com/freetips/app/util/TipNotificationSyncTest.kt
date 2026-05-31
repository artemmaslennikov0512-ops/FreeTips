package com.freetips.app.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
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
    fun first_sync_delivers_tip_and_marks_delivered() {
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

        val store = TipPushMarkStore.load(context)
        assertTrue(store.isDelivered("tip-a"))
        assertEquals(1, BalanceNotificationHelper.getInAppList(context).size)
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

        // первый sync отправляет пуш и ставит delivered
        TipNotificationSync.syncTips(context, listOf(tip))
        // повторный sync того же tip-id
        TipNotificationSync.syncTips(context, listOf(tip))

        assertEquals(1, BalanceNotificationHelper.getInAppList(context).size)
    }
}
