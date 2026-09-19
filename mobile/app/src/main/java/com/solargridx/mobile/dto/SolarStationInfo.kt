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
    val status: String
)

data class OperationalSchedule(
    val openTime: String,
    val closeTime: String,
    val activeDays: List<String>
)
