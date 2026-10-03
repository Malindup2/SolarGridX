package com.solargridx.mobile.reservations.ui

import java.text.DecimalFormat
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/*
 * Display formatting for the reservation screens. The system runs on Sri Lanka
 * time (UTC+05:30): a slot's date and its "HH:mm" times are Sri Lanka wall-clock
 * values, and "now" is read in that zone whatever the phone's own zone is. Slot
 * dates arrive as midnight ("2026-10-03T00:00:00Z") and are only a calendar day,
 * so they are read in UTC to keep the day. Real timestamps (booked, completed)
 * are exact instants and are shown in Sri Lanka time.
 */
object Formatters {

    private val UTC: TimeZone = TimeZone.getTimeZone("UTC")
    private val SRI_LANKA: TimeZone = TimeZone.getTimeZone("Asia/Colombo")
    private val KWH = DecimalFormat("#,##0.##")

    private fun isoParser(pattern: String) = SimpleDateFormat(pattern, Locale.US).apply { timeZone = UTC }

    private fun sriLanka(pattern: String, locale: Locale = Locale.US) =
        SimpleDateFormat(pattern, locale).apply { timeZone = SRI_LANKA }

    /** A calendar in Sri Lanka time, for stepping through the days of the booking window. */
    fun sriLankaCalendar(): Calendar = Calendar.getInstance(SRI_LANKA)

    /** yyyy-MM-dd of a moment in Sri Lanka time. */
    fun sriLankaDayKey(moment: Date): String = sriLanka("yyyy-MM-dd").format(moment)

    /** "EEE" label of a moment in Sri Lanka time. */
    fun sriLankaWeekday(moment: Date): String = sriLanka("EEE", Locale.getDefault()).format(moment)

    /** "Saturday, 3 October": today's date in Sri Lanka time, for the home headers. */
    fun todayLabel(): String = sriLanka("EEEE, d MMMM", Locale.getDefault()).format(Date())

    /** "Saturday, 3 October · 20:52": the date and time in Sri Lanka, for the home headers. */
    fun nowLabel(): String = sriLanka("EEEE, d MMMM · HH:mm", Locale.getDefault()).format(Date())

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

    /** Today in Sri Lanka as yyyy-MM-dd, comparable with dayKey(). Slot days and times are Sri Lanka time. */
    fun todayKey(): String = sriLankaDayKey(Date())

    /** Last day (Sri Lanka, yyyy-MM-dd) a booking may fall on: today plus the 7-day window (BR-01). */
    fun lastBookableDayKey(): String = sriLankaDayKey(Date(System.currentTimeMillis() + 7L * 24 * 60 * 60 * 1000))

    /** "yyyy-MM-ddHH:mm" for now in Sri Lanka, comparable with dayKey(date) + endTime. */
    fun nowKey(): String = sriLanka("yyyy-MM-ddHH:mm").format(Date())

    /** True once a slot's start time has passed; such a slot can no longer be booked. */
    fun hasStarted(slotDate: String, startTime: String): Boolean = dayKey(slotDate) + startTime <= nowKey()

    /** Whole minutes from now until a slot starts (negative once it has), both in Sri Lanka time. */
    fun minutesUntil(slotDate: String, startTime: String): Long {
        val format = sriLanka("yyyy-MM-ddHH:mm")
        val start = format.parse(dayKey(slotDate) + startTime) ?: return 0
        return Math.floorDiv(start.time - System.currentTimeMillis(), 60_000L)
    }

    fun slotTime(start: String, end: String): String = "$start – $end"

    /** Sri Lanka date and time for audit timestamps (booked, completed). */
    fun dateTime(value: String?): String =
        parse(value)?.let { sriLanka("d MMM yyyy, HH:mm", Locale.getDefault()).format(it) } ?: "—"

    fun kwh(value: Double): String = "${KWH.format(value)} kWh"

    /** Sort key: slot day then start time. */
    fun sortKey(date: String, start: String): String = dayKey(date) + start
}
