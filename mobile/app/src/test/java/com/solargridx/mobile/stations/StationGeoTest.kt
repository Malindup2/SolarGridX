package com.solargridx.mobile.stations

import com.solargridx.mobile.dto.OperationalSchedule
import com.solargridx.mobile.dto.SolarStationInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class StationGeoTest {

    private fun station(id: String, name: String, lat: Double, lng: Double, status: String = "Active", location: String = "Somewhere") =
        SolarStationInfo(id, name, location, lat, lng, 120.0, 4, "AC", OperationalSchedule("06:00", "18:00", listOf("Monday")), status)

    // Colombo Fort and Kandy, about 94 km apart in a straight line.
    private val colombo = 6.9344 to 79.8428
    private val kandy = 7.2906 to 80.6337

    @Test
    fun distanceKm_matchesAKnownDistance() {
        val km = StationGeo.distanceKm(colombo.first, colombo.second, kandy.first, kandy.second)
        assertEquals(94.0, km, 2.0)
    }

    @Test
    fun distanceKm_isZeroForTheSamePoint() {
        assertEquals(0.0, StationGeo.distanceKm(7.0, 80.0, 7.0, 80.0), 1e-9)
    }

    @Test
    fun sorted_putsTheNearestFirstWhenTheLocationIsKnown() {
        val far = station("far", "A Kandy Hub", kandy.first, kandy.second)
        val near = station("near", "Z Colombo Hub", colombo.first, colombo.second)

        val result = StationGeo.sorted(listOf(far, near), colombo.first, colombo.second)

        assertEquals(listOf("near", "far"), result.map { it.station.id })
        assertEquals(0.0, result.first().km!!, 0.5)
    }

    @Test
    fun sorted_isAlphabeticalWithoutALocation() {
        val result = StationGeo.sorted(
            listOf(station("b", "Bravo", 0.0, 0.0), station("a", "alpha", 0.0, 0.0)), null, null
        )

        assertEquals(listOf("a", "b"), result.map { it.station.id })
        assertNull(result.first().km)
    }

    @Test
    fun sorted_putsInactiveStationsLast() {
        val closedButNear = station("closed", "Near", colombo.first, colombo.second, status = "Inactive")
        val openButFar = station("open", "Far", kandy.first, kandy.second)

        val result = StationGeo.sorted(listOf(closedButNear, openButFar), colombo.first, colombo.second)

        assertEquals(listOf("open", "closed"), result.map { it.station.id })
    }

    @Test
    fun formatDistance_usesMetresThenKilometres() {
        assertEquals("850 m", StationGeo.formatDistance(0.853))
        assertEquals("10 m", StationGeo.formatDistance(0.001))
        assertEquals("4.2 km", StationGeo.formatDistance(4.24))
        assertEquals("38 km", StationGeo.formatDistance(38.7))
    }

    @Test
    fun matches_searchesNameAndAddressIgnoringCase() {
        val hub = station("1", "Negombo Solar Hub", 0.0, 0.0, location = "Beach Road")

        assertTrue(StationGeo.matches(hub, "negombo"))
        assertTrue(StationGeo.matches(hub, "BEACH"))
        assertTrue(StationGeo.matches(hub, "  "))
        assertFalse(StationGeo.matches(hub, "kandy"))
    }
}
