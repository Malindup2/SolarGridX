package com.solargridx.mobile.dto

data class EnergyReservation(
    val id: String,
    val nic: String,
    val stationId: String,
    val slotId: String,
    val reservationDate: String,
    val startTime: String,
    val endTime: String,
    val energyKwh: Double,
    val status: String,
    val qrToken: String?,
    val approvedBy: String?,
    val rejectionReason: String?,
    val completedAt: String?
)
