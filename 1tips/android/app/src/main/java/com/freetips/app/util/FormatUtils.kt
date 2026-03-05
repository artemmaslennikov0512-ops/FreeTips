package com.freetips.app.util

import java.util.Locale

/**
 * Форматирование сумм: пробел как разделитель тысяч, точка для копеек (вариант 1).
 * Пример: 10 000.00 ₽, -1 208.50 ₽
 * Используем Locale.US, чтобы десятичный разделитель всегда был точкой (в ru — запятая, из-за чего split(".") падал).
 */
fun formatKopToRub(kop: Int): String = formatRub(kop / 100.0)

fun formatKopToRub(kop: Long): String = formatRub(kop / 100.0)

/** Сумма в рублях с опциональным минусом (для списаний). */
fun formatRub(rub: Double, signed: Boolean = false): String {
    val abs = kotlin.math.abs(rub)
    val sign = when {
        !signed -> ""
        rub < 0 -> "-"
        else -> ""
    }
    val s = String.format(Locale.US, "%.2f", abs)
    val parts = s.split(".")
    val intPart = parts.getOrElse(0) { "0" }
    val decPart = parts.getOrElse(1) { "00" }
    val intWithSpaces = intPart.reversed().chunked(3).joinToString("\u00A0").reversed()
    return "$sign$intWithSpaces.$decPart ₽"
}
