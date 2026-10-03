package com.solargridx.mobile.reservations

import android.os.Bundle
import androidx.core.os.bundleOf
import com.google.gson.Gson
import com.solargridx.mobile.dto.ReservationResponse
import com.solargridx.mobile.reservations.ui.BookingDraft

/*
 * Navigation arguments shared by the booking screens:
 *   slot selection passes stationId, slotId, slotDate, startTime, endTime, capacityKwh to energy input
 *   an approved reservation passes reservationId to the QR screen
 */
object ReservationArgs {
    const val STATION_ID = "stationId"
    const val STATION_NAME = "stationName"
    const val SLOT_ID = "slotId"
    const val SLOT_DATE = "slotDate"
    const val START_TIME = "startTime"
    const val END_TIME = "endTime"
    const val CAPACITY_KWH = "capacityKwh"
    const val ENERGY_KWH = "energyKwh"

    const val RESERVATION_ID = "reservationId"
    const val RESERVATION_JSON = "reservationJson"
    const val SUMMARY_ACTION = "summaryAction"
    const val PICKER_MODE = "pickerMode"
    const val EXPECTED_UPDATED_AT = "expectedUpdatedAt"

    const val MODE_BOOK = "book"
    const val MODE_RESCHEDULE = "reschedule"

    private val gson = Gson()

    fun draftBundle(draft: BookingDraft): Bundle = bundleOf(
        STATION_ID to draft.stationId,
        STATION_NAME to draft.stationName,
        SLOT_ID to draft.slotId,
        SLOT_DATE to draft.slotDate,
        START_TIME to draft.startTime,
        END_TIME to draft.endTime,
        CAPACITY_KWH to draft.capacityKwh,
        ENERGY_KWH to (draft.energyKwh ?: 0.0)
    )

    fun draftFrom(args: Bundle?): BookingDraft? {
        if (args == null) return null
        val stationId = args.getString(STATION_ID) ?: return null
        val slotId = args.getString(SLOT_ID) ?: return null
        return BookingDraft(
            stationId = stationId,
            stationName = args.getString(STATION_NAME).orEmpty(),
            slotId = slotId,
            slotDate = args.getString(SLOT_DATE).orEmpty(),
            startTime = args.getString(START_TIME).orEmpty(),
            endTime = args.getString(END_TIME).orEmpty(),
            capacityKwh = args.getDouble(CAPACITY_KWH),
            energyKwh = args.getDouble(ENERGY_KWH).takeIf { it > 0 }
        )
    }

    fun summaryBundle(action: SummaryAction, reservation: ReservationResponse): Bundle =
        bundleOf(SUMMARY_ACTION to action.name, RESERVATION_JSON to gson.toJson(reservation))

    fun reservationFrom(args: Bundle?): ReservationResponse? =
        args?.getString(RESERVATION_JSON)?.let { gson.fromJson(it, ReservationResponse::class.java) }

    fun idBundle(id: String): Bundle = bundleOf(RESERVATION_ID to id)
}

/** The action whose response the summary screen shows (one reusable screen for all). */
enum class SummaryAction { CREATED, UPDATED, RESCHEDULED, CANCELLED, APPROVED, REJECTED }
