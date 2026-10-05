package com.solargridx.mobile.reservations.ui

import com.solargridx.mobile.TestData
import java.util.TimeZone
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.BeforeClass
import org.junit.Test

class FormattersTest {

    companion object {
        @JvmStatic
        @BeforeClass
        fun pinLocale() = TestData.useEnglishLocale()
    }

    @Test
    fun slotDate_formatsAUtcMidnightDay() {
        assertEquals("Sat, 3 Oct 2026", Formatters.slotDate("2026-10-03T00:00:00Z"))
    }

    @Test
    fun slotDate_neverShiftsTheDayWhateverTheDeviceTimezone() {
        val original = TimeZone.getDefault()
        try {
            // West of UTC, a local-time formatter would show the 2nd.
            TimeZone.setDefault(TimeZone.getTimeZone("America/Los_Angeles"))
            assertEquals("Sat, 3 Oct 2026", Formatters.slotDate("2026-10-03T00:00:00Z"))
        } finally {
            TimeZone.setDefault(original)
        }
    }

    @Test
    fun slotDate_acceptsDotNetFractionalSecondsOfAnyLength() {
        assertEquals("Sat, 3 Oct 2026", Formatters.slotDate("2026-10-03T00:00:00.0000000Z"))
        assertEquals("Sat, 3 Oct 2026", Formatters.slotDate("2026-10-03T00:00:00.123Z"))
    }

    @Test
    fun slotDate_acceptsAPlainDate() {
        assertEquals("Sat, 3 Oct 2026", Formatters.slotDate("2026-10-03"))
    }

    @Test
    fun slotDate_showsADashForMissingOrInvalidValues() {
        assertEquals("—", Formatters.slotDate(null))
        assertEquals("—", Formatters.slotDate(""))
        assertEquals("—", Formatters.slotDate("   "))
        assertEquals("—", Formatters.slotDate("not a date"))
    }

    @Test
    fun dayChip_isACompactWeekdayAndDay() {
        assertEquals("Sat 3", Formatters.dayChip("2026-10-03T00:00:00Z"))
    }

    @Test
    fun dayChip_fallsBackToTheRawValue() {
        assertEquals("garbage", Formatters.dayChip("garbage"))
    }

    @Test
    fun dayKey_keepsOnlyTheDatePart() {
        assertEquals("2026-10-03", Formatters.dayKey("2026-10-03T00:00:00Z"))
        assertEquals("2026-10-03", Formatters.dayKey("2026-10-03"))
    }

    @Test
    fun todayKey_and_nowKey_haveTheShapeTheListScreensCompareAgainst() {
        assertTrue(Formatters.todayKey().matches(Regex("""\d{4}-\d{2}-\d{2}""")))
        assertTrue(Formatters.nowKey().matches(Regex("""\d{4}-\d{2}-\d{2}\d{2}:\d{2}""")))
        assertTrue(Formatters.nowKey().startsWith(Formatters.todayKey()))
    }

    @Test
    fun slotTime_joinsWithAnEnDash() {
        assertEquals("09:00 – 10:30", Formatters.slotTime("09:00", "10:30"))
    }

    @Test
    fun dateTime_includesDateAndTime() {
        val text = Formatters.dateTime("2026-10-01T08:14:22Z")
        assertTrue(text, text.contains("Oct 2026"))
        assertTrue(text, text.matches(Regex(""".*\d{2}:\d{2}$""")))
    }

    @Test
    fun dateTime_showsADashWhenMissing() {
        assertEquals("—", Formatters.dateTime(null))
    }

    @Test
    fun kwh_dropsTrailingZerosAndKeepsTwoDecimals() {
        assertEquals("30 kWh", Formatters.kwh(30.0))
        assertEquals("12.5 kWh", Formatters.kwh(12.5))
        assertEquals("12.35 kWh", Formatters.kwh(12.3456))
    }

    @Test
    fun kwh_groupsThousands() {
        assertEquals("1,200 kWh", Formatters.kwh(1200.0))
    }

    @Test
    fun sortKey_ordersByDayThenStartTime() {
        val keys = listOf(
            Formatters.sortKey("2026-10-04T00:00:00Z", "08:00"),
            Formatters.sortKey("2026-10-03T00:00:00Z", "13:00"),
            Formatters.sortKey("2026-10-03T00:00:00Z", "09:00")
        )

        assertEquals(
            listOf("2026-10-0309:00", "2026-10-0313:00", "2026-10-0408:00"),
            keys.sorted()
        )
    }
}
