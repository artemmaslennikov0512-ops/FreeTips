package com.freetips.app.util

import kotlin.random.Random

/** Небольшой случайный сдвиг, чтобы разные опросы не стартовали в одну миллисекунду. */
object PollJitter {
    private const val JITTER_MS = 5_000L

    fun withJitter(baseMs: Long): Long {
        if (baseMs <= 0L) return 0L
        val delta = Random.nextLong(0L, JITTER_MS + 1L)
        return baseMs + delta
    }
}
