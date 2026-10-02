package com.solargridx.mobile.dto

/*
 * Reservation and dashboard shapes exchanged with the API
 * (api/DTOs/Reservations, api/DTOs/Dashboards). Dates are ISO-8601 UTC strings,
 * times are "HH:mm".
 */

data class ReservationResponse(
    val id: String,
    val nic: String,
    val stationId: String,
    val stationName: String,
    val slotId: String,
    val reservationDate: String,
    val startTime: String,
    val endTime: String,
    val slotTime: String,
    val energyKwh: Double,
    val status: String,
    val qrEligible: Boolean,
    val approvedBy: String?,
    val rejectionReason: String?,
    val completedAt: String?,
    val createdAt: String,
    val updatedAt: String
)

data class CreateReservationRequest(
    val nic: String,
    val stationId: String,
    val slotId: String,
    /** yyyy-MM-dd */
    val reservationDate: String,
    val startTime: String,
    val endTime: String,
    val energyKwh: Double
)

/** `expectedUpdatedAt` is the version the screen loaded; the API refuses the save if someone changed the booking since. */
data class UpdateReservationRequest(val energyKwh: Double, val expectedUpdatedAt: String? = null)

data class RescheduleReservationRequest(val slotId: String, val expectedUpdatedAt: String? = null)

data class RejectReservationRequest(val reason: String)

data class ProsumerDashboardResponse(
    val nic: String,
    val activeCount: Int,
    val pendingCount: Int,
    val approvedFutureCount: Int
)

data class OperatorDashboardResponse(
    val stationId: String,
    val stationName: String,
    val pendingCount: Int,
    val approvedFutureCount: Int,
    val pendingReservations: List<ReservationResponse>
)

/** Only the fields the reservation screens read from GET /prosumers/{nic}. */
data class ProsumerStatusResponse(
    val nic: String,
    val fullName: String,
    val status: String
)
