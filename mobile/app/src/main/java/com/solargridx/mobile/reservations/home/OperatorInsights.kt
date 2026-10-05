package com.solargridx.mobile.reservations.home

import com.solargridx.mobile.dto.EnergyBookingSlot
import com.solargridx.mobile.dto.ReservationResponse
import com.solargridx.mobile.reservations.ui.Formatters

/** What the operator dashboard shows beyond the pending queue, worked out from one station's bookings and slots. */
data class OperatorInsights(
    val bookingsToday: Int,
    val completedToday: Int,
    val kwhToday: Double,
    val baysReserved: Int,
    val baysTotal: Int,
    val next: ReservationResponse?,
    val week: List<HomeInsights.DayEnergy>,
    val statusCounts: Map<String, Int>,
    val total: Int
) {
    companion object {
        private val LIVE = setOf("Pending", "Approved", "Completed")

        fun of(reservations: List<ReservationResponse>, slots: List<EnergyBookingSlot>, bayCount: Int): OperatorInsights {
            val today = Formatters.todayKey()
            val now = Formatters.nowKey()
            val todays = reservations.filter { Formatters.dayKey(it.reservationDate) == today && it.status in LIVE }
            val todaysSlots = slots.filter { Formatters.dayKey(it.slotDate) == today }
            return OperatorInsights(
                bookingsToday = todays.size,
                completedToday = todays.count { it.status == "Completed" },
                kwhToday = todays.sumOf { it.energyKwh },
                baysReserved = todaysSlots.sumOf { it.reservedCount },
                baysTotal = todaysSlots.size * bayCount,
                next = reservations
                    .filter { it.status == "Approved" && Formatters.dayKey(it.reservationDate) + it.endTime > now }
                    .minByOrNull { Formatters.sortKey(it.reservationDate, it.startTime) },
                week = HomeInsights.nextSevenDays(reservations),
                statusCounts = HomeInsights.statusCounts(reservations),
                total = reservations.size
            )
        }
    }
}
