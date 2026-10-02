package com.solargridx.mobile.reservations.home

import com.solargridx.mobile.dto.ReservationResponse
import com.solargridx.mobile.reservations.ui.Formatters
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Numbers for the home charts, derived from the prosumer's own bookings (the
 * API has no aggregate endpoint for these). Display-only, no business rules.
 */
object HomeInsights {

    data class DayEnergy(val dayKey: String, val label: String, val kwh: Double)

    private val live = setOf("Pending", "Approved")

    fun upcomingKwh(items: List<ReservationResponse>, status: String) =
        items.filter { it.status == status && Formatters.dayKey(it.reservationDate) >= Formatters.todayKey() }
            .sumOf { it.energyKwh }

    /** kWh booked per day for today and the next six days (the booking window). Cancelled / rejected excluded. */
    fun nextSevenDays(items: List<ReservationResponse>): List<DayEnergy> {
        val keyFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val labelFormat = SimpleDateFormat("EEE", Locale.getDefault())
        val counted = items.filter { it.status in live || it.status == "Completed" }
        return (0 until 7).map { offset ->
            val day = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, offset) }.time
            val key = keyFormat.format(day)
            DayEnergy(key, labelFormat.format(day), counted.filter { Formatters.dayKey(it.reservationDate) == key }.sumOf { it.energyKwh })
        }
    }

    fun statusCounts(items: List<ReservationResponse>): Map<String, Int> =
        listOf("Pending", "Approved", "Completed", "Cancelled", "Rejected").associateWith { s -> items.count { it.status == s } }

    fun recent(items: List<ReservationResponse>, limit: Int = 3) = items.sortedByDescending { it.createdAt }.take(limit)
}
