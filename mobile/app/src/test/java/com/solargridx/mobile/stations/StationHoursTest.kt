package com.solargridx.mobile.stations

import com.google.gson.Gson
import com.solargridx.mobile.dto.DayHours
import com.solargridx.mobile.dto.OperationalSchedule
import com.solargridx.mobile.dto.RescheduleReservationRequest
import com.solargridx.mobile.dto.SolarStationInfo
import com.solargridx.mobile.dto.UpdateReservationRequest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class StationHoursTest {

    private val plain = OperationalSchedule("06:00", "18:00", listOf("Monday", "Tuesday", "Saturday"))
    private val special = plain.copy(dayHours = listOf(DayHours("Saturday", "08:00", "12:00")))

    @Test
    fun aDayUsesItsOwnHoursElseTheDefault() {
        assertEquals("08:00" to "12:00", StationHours.hoursFor(special, "Saturday"))
        assertEquals("08:00" to "12:00", StationHours.hoursFor(special, "saturday"))
        assertEquals("06:00" to "18:00", StationHours.hoursFor(special, "Monday"))
        assertEquals("06:00" to "18:00", StationHours.hoursFor(plain, "Saturday"))
    }

    @Test
    fun detectsWhetherAnyOperatingDayHasItsOwnHours() {
        assertFalse(StationHours.hasPerDayHours(plain))
        assertFalse(StationHours.hasPerDayHours(plain.copy(dayHours = emptyList())))
        assertTrue(StationHours.hasPerDayHours(special))
        // Hours for a day the station is closed on do not count.
        assertFalse(StationHours.hasPerDayHours(plain.copy(dayHours = listOf(DayHours("Sunday", "08:00", "09:00")))))
    }

    @Test
    fun listsOneRowPerOperatingDayMondayFirst() {
        assertEquals(
            listOf("Mon" to "06:00–18:00", "Tue" to "06:00–18:00", "Sat" to "08:00–12:00"),
            StationHours.perDay(special)
        )
    }

    @Test
    fun parsesAStationThatHasNoPerDayHoursField() {
        val json = """{"id":"s1","stationName":"Hub","location":"Road","latitude":6.9,"longitude":79.8,"capacityKwh":120.0,
            "batterySlotCount":4,"type":"AC","status":"Active",
            "operationalSchedule":{"openTime":"06:00","closeTime":"18:00","activeDays":["Monday"]}}"""

        val station = Gson().fromJson(json, SolarStationInfo::class.java)

        assertNull(station.operationalSchedule.dayHours)
        assertFalse(StationHours.hasPerDayHours(station.operationalSchedule))
    }

    @Test
    fun parsesPerDayHoursFromTheApi() {
        val json = """{"openTime":"06:00","closeTime":"18:00","activeDays":["Saturday"],
            "dayHours":[{"day":"Saturday","openTime":"08:00","closeTime":"12:00"}]}"""

        val schedule = Gson().fromJson(json, OperationalSchedule::class.java)

        assertEquals("08:00" to "12:00", StationHours.hoursFor(schedule, "Saturday"))
    }

    @Test
    fun theEditVersionIsSentWhenKnownAndOmittedWhenNot() {
        val gson = Gson()

        assertEquals("""{"energyKwh":20.0,"expectedUpdatedAt":"2026-10-01T08:14:22.123Z"}""", gson.toJson(UpdateReservationRequest(20.0, "2026-10-01T08:14:22.123Z")))
        assertEquals("""{"energyKwh":20.0}""", gson.toJson(UpdateReservationRequest(20.0)))
        assertEquals("""{"slotId":"s2","expectedUpdatedAt":"v1"}""", gson.toJson(RescheduleReservationRequest("s2", "v1")))
        assertEquals("""{"slotId":"s2"}""", gson.toJson(RescheduleReservationRequest("s2")))
    }
}
