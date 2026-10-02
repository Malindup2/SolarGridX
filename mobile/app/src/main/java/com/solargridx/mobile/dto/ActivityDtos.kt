package com.solargridx.mobile.dto

/*
 * Notifications, QR, slot and profile shapes exchanged with the API
 * (api/DTOs/Activity, Qr, Slots, Users).
 */

data class NotificationItem(
    val id: String,
    val category: String,
    val priority: String,
    val message: String,
    val action: String,
    val resourceId: String?,
    val createdAt: String,
    val readAt: String?
)

data class NotificationInbox(val unreadCount: Int, val items: List<NotificationItem>)

data class QrTokenResponse(val reservationId: String, val qrToken: String, val expiresAt: String)

data class QrVerifyRequest(val qrToken: String, val operatorId: String? = null, val stationId: String? = null)

data class QrVerifyResponse(
    val valid: Boolean,
    val reservationId: String,
    val prosumerName: String,
    val nic: String,
    val stationId: String,
    val stationName: String,
    val energyKwh: Double,
    val slotTime: String,
    val status: String,
    /** Null on a preview: nothing has been completed yet. */
    val completedAt: String?
)

data class SlotAvailabilityRequest(val isAvailable: Boolean)

data class ProfileResponse(
    val id: String,
    val fullName: String,
    val email: String,
    val phone: String?,
    val address: String?,
    val nic: String?,
    val role: String,
    val status: String,
    val createdAt: String,
    val updatedAt: String,
    /** Changes whenever the photo changes; null when there is none. */
    val avatarVersion: String?
)
