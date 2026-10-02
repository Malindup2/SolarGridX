package com.solargridx.mobile.reservations.ui

import com.solargridx.mobile.TestData
import com.solargridx.mobile.TestData.reservation
import org.junit.Assert.assertEquals
import org.junit.BeforeClass
import org.junit.Test

class ReservationSearchTest {

    companion object {
        @JvmStatic
        @BeforeClass
        fun pinLocale() = TestData.useEnglishLocale()
    }

    private val negombo = reservation(id = "a", nic = "199812345678", stationName = "Negombo Solar Hub", status = "Pending")
    private val kandy = reservation(
        id = "b", nic = "851234567V", stationName = "Kandy Hill Hub", status = "Approved",
        reservationDate = "2026-10-05T00:00:00Z", startTime = "14:00", endTime = "15:00"
    )
    private val all = listOf(negombo, kandy)
    private val names = mapOf("199812345678" to "Amal Perera", "851234567V" to "Nimali Silva")

    private fun ids(query: String) = ReservationSearch.filter(all, query, names).map { it.id }

    @Test
    fun aBlankQueryKeepsEverything() {
        assertEquals(listOf("a", "b"), ids(""))
        assertEquals(listOf("a", "b"), ids("   "))
    }

    @Test
    fun matchesTheProsumerName() = assertEquals(listOf("a"), ids("amal"))

    @Test
    fun matchesTheNic() = assertEquals(listOf("b"), ids("851234567v"))

    @Test
    fun matchesTheStation() = assertEquals(listOf("b"), ids("kandy"))

    @Test
    fun matchesTheStatus() = assertEquals(listOf("b"), ids("approved"))

    @Test
    fun matchesTheTime() = assertEquals(listOf("b"), ids("14:00"))

    @Test
    fun matchesTheFormattedDate() {
        // "Sat, 3 Oct 2026" vs "Mon, 5 Oct 2026"
        assertEquals(listOf("a"), ids("sat"))
        assertEquals(listOf("b"), ids("mon"))
    }

    @Test
    fun isCaseInsensitive() = assertEquals(listOf("a"), ids("NEGOMBO"))

    @Test
    fun everyTermMustMatch() {
        assertEquals(listOf("a"), ids("negombo pending"))
        assertEquals(emptyList<String>(), ids("negombo approved"))
    }

    @Test
    fun extraWhitespaceBetweenTermsIsIgnored() = assertEquals(listOf("a"), ids("  negombo    pending  "))

    @Test
    fun noMatchGivesAnEmptyList() = assertEquals(emptyList<String>(), ids("zzz"))

    @Test
    fun nameLookupIsCaseInsensitiveOnTheNic() {
        assertEquals("Nimali Silva", names.nameFor("851234567v"))
    }

    @Test
    fun nameFor_fallsBackToTheNicWhenUnknown() {
        assertEquals("900000001V", names.nameFor("900000001V"))
    }
}
