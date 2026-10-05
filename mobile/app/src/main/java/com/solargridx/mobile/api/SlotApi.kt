package com.solargridx.mobile.api

import com.solargridx.mobile.dto.EnergyBookingSlot
import com.solargridx.mobile.dto.SlotAvailabilityRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.Path
import retrofit2.http.Query

/** Booking slots. Writes are Grid Operator only. */
interface SlotApi {

    @GET("stations/{stationId}/slots")
    suspend fun forStation(@Path("stationId") stationId: String): Response<List<EnergyBookingSlot>>

    /** Slots across every station; available = true leaves out the ones taken offline. */
    @GET("slots")
    suspend fun all(@Query("available") available: Boolean? = null): Response<List<EnergyBookingSlot>>

    /** Takes a slot offline (maintenance) or brings it back. */
    @PATCH("slots/{id}/availability")
    suspend fun setAvailability(@Path("id") id: String, @Body request: SlotAvailabilityRequest): Response<EnergyBookingSlot>
}
