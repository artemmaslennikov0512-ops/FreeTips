package com.freetips.app.util

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class TipPushMarkStoreTest {

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
    fun pending_then_delivered_survives_reload() {
        val store = TipPushMarkStore.load(context)

        assertTrue(store.markPending("tip-1"))
        assertTrue(store.isPending("tip-1"))
        assertFalse(store.isDelivered("tip-1"))

        assertTrue(store.markDelivered("tip-1"))
        assertTrue(store.isDelivered("tip-1"))
        assertFalse(store.isPending("tip-1"))

        val reloaded = TipPushMarkStore.load(context)
        assertTrue(reloaded.isDelivered("tip-1"))
        assertFalse(reloaded.isPending("tip-1"))
    }

    @Test
    fun duplicate_pending_is_blocked() {
        val store = TipPushMarkStore.load(context)

        assertTrue(store.markPending("tip-2"))
        assertFalse(store.markPending("tip-2"))
    }
}
