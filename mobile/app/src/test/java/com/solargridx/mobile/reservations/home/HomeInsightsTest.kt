package com.solargridx.mobile.reservations.home

import com.solargridx.mobile.TestData.reservation
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import org.junit.Assert.assertEquals
import org.junit.Test

class HomeInsightsTest {

    /** yyyy-MM-dd for today plus [offset] days, in the device's timezone (what HomeInsights compares against). */
    private fun day(offset: Int): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, offset) }.time)

    private fun on(offset: Int, status: String, kwh: Double, createdAt: String = "2026-10-01T08:00:00Z") =
        reservation(status = status, reservationDate = "${day(offset)}T00:00:00Z", energyKwh = kwh, createdAt = createdAt)

    // ---- upcomingKwh ----

    @Test
    fun upcomingKwh_sumsOnlyTheRequestedStatusFromTodayOn() {
        val items = listOf(
            on(0, "Approved", 10.0),
            on(3, "Approved", 5.5),
            on(-1, "Approved", 99.0), // yesterday: not upcoming
            on(2, "Pending", 7.0) // other status
        )

        assertEquals(15.5, HomeInsights.upcomingKwh(items, "Approved"), 0.0001)
        assertEquals(7.0, HomeInsights.upcomingKwh(items, "Pending"), 0.0001)
    }

    @Test
    fun upcomingKwh_isZeroForNoBookings() {
        assertEquals(0.0, HomeInsights.upcomingKwh(emptyList(), "Approved"), 0.0)
    }

    // ---- nextSevenDays ----

    @Test
    fun nextSevenDays_coversTodayPlusSixDays() {
        val days = HomeInsights.nextSevenDays(emptyList())

        assertEquals(7, days.size)
        assertEquals((0..6).map { day(it) }, days.map { it.dayKey })
    }

    @Test
    fun nextSevenDays_sumsLiveAndCompletedBookingsPerDay() {
        val items = listOf(
            on(0, "Pending", 10.0),
            on(0, "Approved", 5.0),
            on(0, "Completed", 2.0),
            on(1, "Approved", 8.0)
        )

        val days = HomeInsights.nextSevenDays(items)

        assertEquals(17.0, days[0].kwh, 0.0001)
        assertEquals(8.0, days[1].kwh, 0.0001)
        assertEquals(0.0, days[2].kwh, 0.0001)
    }

    @Test
    fun nextSevenDays_ignoresCancelledAndRejected() {
        val items = listOf(on(0, "Cancelled", 10.0), on(0, "Rejected", 20.0))

        assertEquals(0.0, HomeInsights.nextSevenDays(items)[0].kwh, 0.0)
    }

    @Test
    fun nextSevenDays_ignoresBookingsOutsideTheWindow() {
        val items = listOf(on(7, "Approved", 10.0), on(-1, "Approved", 10.0))

        assertEquals(0.0, HomeInsights.nextSevenDays(items).sumOf { it.kwh }, 0.0)
    }

    // ---- statusCounts ----

    @Test
    fun statusCounts_includesEveryStatusEvenAtZero() {
        val counts = HomeInsights.statusCounts(listOf(on(1, "Pending", 1.0), on(2, "Pending", 1.0), on(3, "Rejected", 1.0)))

        assertEquals(
            mapOf("Pending" to 2, "Approved" to 0, "Completed" to 0, "Cancelled" to 0, "Rejected" to 1),
            counts
        )
    }

    @Test
    fun statusCounts_keepsTheDisplayOrder() {
        assertEquals(
            listOf("Pending", "Approved", "Completed", "Cancelled", "Rejected"),
            HomeInsights.statusCounts(emptyList()).keys.toList()
        )
    }

    // ---- recent ----

    @Test
    fun recent_isNewestFirstAndLimited() {
        val items = listOf(
            on(1, "Pending", 1.0, createdAt = "2026-10-01T08:00:00Z"),
            on(1, "Pending", 2.0, createdAt = "2026-10-03T08:00:00Z"),
            on(1, "Pending", 3.0, createdAt = "2026-10-02T08:00:00Z"),
            on(1, "Pending", 4.0, createdAt = "2026-09-30T08:00:00Z")
        )

        assertEquals(listOf(2.0, 3.0, 1.0), HomeInsights.recent(items).map { it.energyKwh })
        assertEquals(listOf(2.0), HomeInsights.recent(items, limit = 1).map { it.energyKwh })
    }
}
