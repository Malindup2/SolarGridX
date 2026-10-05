package com.solargridx.mobile.reservations.ui

import com.solargridx.mobile.dto.ReservationResponse

/**
 * Client-side search over reservations already on screen (no extra requests).
 * Matches prosumer name, NIC, station, status, date and time.
 */
object ReservationSearch {

    fun filter(items: List<ReservationResponse>, query: String, names: Map<String, String>): List<ReservationResponse> {
        val terms = query.trim().lowercase().split(Regex("\\s+")).filter { it.isNotEmpty() }
        if (terms.isEmpty()) return items
        return items.filter { r ->
            val haystack = listOf(
                names[r.nic.uppercase()].orEmpty(),
                r.nic,
                r.stationName,
                r.status,
                Formatters.slotDate(r.reservationDate),
                r.startTime,
                r.endTime
            ).joinToString(" ").lowercase()
            terms.all { it in haystack }
        }
    }
}

/** Display name for a prosumer: their name when known, else the NIC. */
fun Map<String, String>.nameFor(nic: String): String = this[nic.uppercase()] ?: nic
