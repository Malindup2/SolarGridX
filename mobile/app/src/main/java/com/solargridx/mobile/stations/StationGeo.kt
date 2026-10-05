package com.solargridx.mobile.stations

import com.solargridx.mobile.dto.SolarStationInfo
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/** A station plus its distance from the user, when the user's location is known. */
data class StationDistance(val station: SolarStationInfo, val km: Double?)

/** Display helpers for the stations screens. The API decides which stations exist and are active. */
object StationGeo {

    private const val EARTH_RADIUS_KM = 6371.0

    /** Great-circle distance in km (haversine). */
    fun distanceKm(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val dLat = Math.toRadians(lat2 - lat1)
        val dLng = Math.toRadians(lng2 - lng1)
        val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLng / 2).pow(2)
        return 2 * EARTH_RADIUS_KM * asin(sqrt(a))
    }

    /** Nearest first when a location is known; otherwise alphabetical. Inactive stations go last. */
    fun sorted(stations: List<SolarStationInfo>, lat: Double?, lng: Double?): List<StationDistance> {
        val withDistance = stations.map { station ->
            val km = if (lat != null && lng != null) distanceKm(lat, lng, station.latitude, station.longitude) else null
            StationDistance(station, km)
        }
        return withDistance.sortedWith(
            compareBy<StationDistance> { it.station.status != "Active" }
                .thenBy { it.km ?: Double.MAX_VALUE }
                .thenBy { it.station.stationName.lowercase() }
        )
    }

    /** "850 m", "4.2 km", "38 km". */
    fun formatDistance(km: Double): String = when {
        km < 1 -> "${((km * 1000).toInt() / 10 * 10).coerceAtLeast(10)} m"
        km < 10 -> String.format(java.util.Locale.US, "%.1f km", km)
        else -> "${km.toInt()} km"
    }

    /** Matches the name or address, case-insensitive. */
    fun matches(station: SolarStationInfo, query: String): Boolean {
        val q = query.trim().lowercase()
        return q.isEmpty() || station.stationName.lowercase().contains(q) || station.location.lowercase().contains(q)
    }
}
