package com.solargridx.mobile.reservations.ui

import java.text.DecimalFormat
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/*
 * Display formatting for the reservation screens. Slot dates arrive as UTC
 * midnight ("2026-10-03T00:00:00Z"), so they are formatted in UTC; the
 * device's +05:30 would otherwise still read correctly, but a device west of
 * UTC would show the previous day.
 */
object Formatters {

    private val UTC: TimeZone = TimeZone.getTimeZone("UTC")
    private val KWH = DecimalFormat("#,##0.##")

    private fun isoParser(pattern: String) = SimpleDateFormat(pattern, Locale.US).apply { timeZone = UTC }

    private fun parse(value: String?): Date? {
        if (value.isNullOrBlank()) return null
        val patterns = listOf("yyyy-MM-dd'T'HH:mm:ss.SSSSSSS'Z'", "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'", "yyyy-MM-dd")
        // .NET can send 1–7 fractional digits; normalise to whole seconds first.
        val normalised = value.replace(Regex("\\.\\d+Z$"), "Z")
        for (pattern in patterns) {
            try {
                return isoParser(pattern).parse(normalised)
            } catch (_: ParseException) {
                // try the next pattern
            }
        }
        return null
    }

    /** "Sat, 3 Oct 2026" for a slot day. */
    fun slotDate(value: String?): String =
        parse(value)?.let { SimpleDateFormat("EEE, d MMM yyyy", Locale.getDefault()).apply { timeZone = UTC }.format(it) } ?: "—"

    /** "Sat 3" — compact day for chips. */
    fun dayChip(value: String): String =
        parse(value)?.let { SimpleDateFormat("EEE d", Locale.getDefault()).apply { timeZone = UTC }.format(it) } ?: value

    /** yyyy-MM-dd key of a slot day (what POST /reservations expects). */
    fun dayKey(value: String): String = value.take(10)

    /** Device-local today as yyyy-MM-dd, comparable with dayKey(). */
    fun todayKey(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    /** "yyyy-MM-ddHH:mm" for now, comparable with dayKey(date) + endTime. */
    fun nowKey(): String = SimpleDateFormat("yyyy-MM-ddHH:mm", Locale.US).format(Date())

    fun slotTime(start: String, end: String): String = "$start – $end"

    /** Device-local date and time for audit timestamps (booked, completed). */
    fun dateTime(value: String?): String =
        parse(value)?.let { SimpleDateFormat("d MMM yyyy, HH:mm", Locale.getDefault()).format(it) } ?: "—"

    fun kwh(value: Double): String = "${KWH.format(value)} kWh"

    /** Sort key: slot day then start time. */
    fun sortKey(date: String, start: String): String = dayKey(date) + start
}
