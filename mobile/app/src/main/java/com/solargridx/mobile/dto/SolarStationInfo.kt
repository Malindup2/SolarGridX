package com.solargridx.mobile.dto

data class SolarStationInfo(
    val id: String,
    val stationName: String,
    val location: String,
    val latitude: Double,
    val longitude: Double,
    val capacityKwh: Double,
    val batterySlotCount: Int,
    val type: String,
    val operationalSchedule: OperationalSchedule,
    val status: String,
    /** Server-worked-out: a slot can be booked here now. Null when the server did not say. */
    val hasUpcomingSlots: Boolean? = null
)

data class OperationalSchedule(
    val openTime: String,
    val closeTime: String,
    val activeDays: List<String>,
    /** Per-day overrides of the default hours; null or empty when every day uses them. */
    val dayHours: List<DayHours>? = null
)

data class DayHours(val day: String, val openTime: String, val closeTime: String)
