package com.solargridx.mobile.dto


data class EnergyBookingSlot(
    val id: String,
    val stationId: String,
    val slotDate: String,
    val startTime: String,
    val endTime: String,
    val capacityKwh: Double,
    val isAvailable: Boolean,
    val reservedCount: Int
)
