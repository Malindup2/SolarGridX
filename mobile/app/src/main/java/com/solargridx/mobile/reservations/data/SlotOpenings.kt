package com.solargridx.mobile.reservations.data

import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.SlotApi
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.safeApiCall
import com.solargridx.mobile.dto.EnergyBookingSlot
import com.solargridx.mobile.dto.SolarStationInfo
import com.solargridx.mobile.reservations.ui.Formatters

/**
 * Whether a prosumer can actually book a slot: online, inside the 7-day window,
 * not started and with a free battery bay. The API enforces each of these (and uses
 * the same rule for a station's hasUpcomingSlots); the slot list applies it per slot
 * so one that cannot be booked is never offered as if it could.
 */
object SlotOpenings {

    fun isFull(slot: EnergyBookingSlot, bayCount: Int): Boolean = bayCount > 0 && slot.reservedCount >= bayCount

    fun inWindow(slot: EnergyBookingSlot): Boolean {
        val day = Formatters.dayKey(slot.slotDate)
        return day >= Formatters.todayKey() && day <= Formatters.lastBookableDayKey()
    }

    fun isBookable(slot: EnergyBookingSlot, bayCount: Int): Boolean =
        slot.isAvailable && inWindow(slot) && !Formatters.hasStarted(slot.slotDate, slot.startTime) && !isFull(slot, bayCount)

    /**
     * The stations a prosumer can book now. Uses the API's hasUpcomingSlots when it sends
     * it for every station; against an older API that does not, works it out from the slots
     * instead (one GET /slots). If even that fails the list is returned unchanged and the
     * slot picker says when a station has nothing open.
     */
    suspend fun withOpenSlots(
        stations: List<SolarStationInfo>,
        api: SlotApi = ApiClient.retrofit.create(SlotApi::class.java)
    ): List<SolarStationInfo> {
        if (stations.all { it.hasUpcomingSlots != null }) return stations.filter { it.hasUpcomingSlots == true }
        val slots = (safeApiCall { api.all(available = true) } as? ApiResult.Success)?.data ?: return stations
        val open = slots
            .filter { slot -> stations.firstOrNull { it.id == slot.stationId }?.let { isBookable(slot, it.batterySlotCount) } == true }
            .map { it.stationId }
            .toSet()
        return stations.filter { it.id in open }
    }
}
