package com.solargridx.mobile.stations

import com.solargridx.mobile.dto.OperationalSchedule

/** Opening hours as shown on station details. Times are Sri Lanka time, as the API stores them. */
object StationHours {

    private val WEEK = listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")

    /** The hours that apply on one weekday: its own override, else the default. */
    fun hoursFor(schedule: OperationalSchedule, day: String): Pair<String, String> {
        val own = schedule.dayHours.orEmpty().firstOrNull { it.day.equals(day, ignoreCase = true) }
        return if (own != null) own.openTime to own.closeTime else schedule.openTime to schedule.closeTime
    }

    /** "06:00–18:00" */
    fun range(open: String, close: String) = "$open–$close"

    /** True when at least one operating day has hours of its own. */
    fun hasPerDayHours(schedule: OperationalSchedule) =
        schedule.dayHours.orEmpty().any { entry -> schedule.activeDays.any { it.equals(entry.day, ignoreCase = true) } }

    /**
     * One row per operating day, Monday first: ("Mon", "06:00–18:00"). Days the station is closed
     * are left out.
     */
    fun perDay(schedule: OperationalSchedule): List<Pair<String, String>> =
        WEEK.filter { day -> schedule.activeDays.any { it.equals(day, ignoreCase = true) } }
            .map { day ->
                val (open, close) = hoursFor(schedule, day)
                day.take(3) to range(open, close)
            }
}
