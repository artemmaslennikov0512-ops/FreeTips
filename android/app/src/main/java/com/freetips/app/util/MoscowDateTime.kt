package com.freetips.app.util

import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/** Отображение дат операций в московском времени (как в веб-кабинете). */
object MoscowDateTime {
    private val display = SimpleDateFormat("dd.MM.yyyy HH:mm", Locale("ru", "RU")).apply {
        timeZone = TimeZone.getTimeZone("Europe/Moscow")
    }
    private val utc = TimeZone.getTimeZone("UTC")
    private val parsers: List<SimpleDateFormat> = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.SSSX",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
        "yyyy-MM-dd'T'HH:mm:ssX",
    ).map { pattern ->
        SimpleDateFormat(pattern, Locale.US).apply { timeZone = utc }
    }

    fun formatOperationCreatedAt(iso: String): String {
        val s = iso.trim()
        if (s.isEmpty()) return ""
        for (fmt in parsers) {
            try {
                val date = fmt.parse(s) ?: continue
                return display.format(date)
            } catch (_: ParseException) {
                // try next
            }
        }
        return s.replace("T", " ").take(16)
    }

    /** Только календарная дата по Москве (для списка выводов и т.п.). */
    fun formatCreatedAtDateOnly(iso: String): String {
        val s = iso.trim()
        if (s.isEmpty()) return ""
        for (fmt in parsers) {
            try {
                val date = fmt.parse(s) ?: continue
                return SimpleDateFormat("dd.MM.yyyy", Locale("ru", "RU")).apply {
                    timeZone = TimeZone.getTimeZone("Europe/Moscow")
                }.format(date)
            } catch (_: ParseException) {
            }
        }
        return s.take(10)
    }
}
