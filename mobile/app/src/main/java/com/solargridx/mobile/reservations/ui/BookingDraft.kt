package com.solargridx.mobile.reservations.ui

/** A booking being put together: slot hand-off fields, plus energy once entered. */
data class BookingDraft(
    val stationId: String,
    val stationName: String,
    val slotId: String,
    /** ISO date or yyyy-MM-dd; trimmed to yyyy-MM-dd when sent. */
    val slotDate: String,
    val startTime: String,
    val endTime: String,
    /** Max energy for ONE booking in this slot (not a shared pool). */
    val capacityKwh: Double,
    val energyKwh: Double? = null
)
