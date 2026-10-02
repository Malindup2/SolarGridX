package com.solargridx.mobile.reservations.data

import com.solargridx.mobile.dto.EnergyBookingSlot
import com.solargridx.mobile.dto.ProsumerStatusResponse
import com.solargridx.mobile.dto.SolarStationInfo
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path

/**
 * TEMPORARY read-only lookups the reservation screens need before the owners'
 * APIs exist: StationApi (M3), SlotApi (M4) and ProsumerApi (M2) are still empty.
 * Once they land, switch ReservationRepository to theirs and delete this file.
 */
interface ReservationLookupApi {

    @GET("stations")
    suspend fun stations(): Response<List<SolarStationInfo>>

    @GET("stations/{stationId}/slots")
    suspend fun stationSlots(@Path("stationId") stationId: String): Response<List<EnergyBookingSlot>>

    /** Backoffice / GridOperator only: used to show prosumer names next to NICs. */
    @GET("prosumers")
    suspend fun prosumers(): Response<List<ProsumerStatusResponse>>

    @GET("prosumers/{nic}")
    suspend fun prosumer(@Path("nic") nic: String): Response<ProsumerStatusResponse>
}
