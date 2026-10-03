package com.solargridx.mobile.api

import com.solargridx.mobile.dto.CreateReservationRequest
import com.solargridx.mobile.dto.OperatorDashboardResponse
import com.solargridx.mobile.dto.ProsumerDashboardResponse
import com.solargridx.mobile.dto.RejectReservationRequest
import com.solargridx.mobile.dto.RescheduleReservationRequest
import com.solargridx.mobile.dto.ReservationResponse
import com.solargridx.mobile.dto.UpdateReservationRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/** Reservation and dashboard endpoints. Business rules live in the API. */
interface ReservationApi {

    @POST("reservations")
    suspend fun create(@Body request: CreateReservationRequest): Response<ReservationResponse>

    /** A prosumer always gets only their own; the API ignores `nic` for them. */
    @GET("reservations")
    suspend fun list(
        @Query("status") status: String? = null,
        @Query("stationId") stationId: String? = null
    ): Response<List<ReservationResponse>>

    @GET("reservations/{id}")
    suspend fun get(@Path("id") id: String): Response<ReservationResponse>

    @PUT("reservations/{id}")
    suspend fun updateEnergy(
        @Path("id") id: String,
        @Body request: UpdateReservationRequest
    ): Response<ReservationResponse>

    @PATCH("reservations/{id}/reschedule")
    suspend fun reschedule(
        @Path("id") id: String,
        @Body request: RescheduleReservationRequest
    ): Response<ReservationResponse>

    @PATCH("reservations/{id}/cancel")
    suspend fun cancel(@Path("id") id: String): Response<ReservationResponse>

    @PATCH("reservations/{id}/approve")
    suspend fun approve(@Path("id") id: String): Response<ReservationResponse>

    @PATCH("reservations/{id}/reject")
    suspend fun reject(
        @Path("id") id: String,
        @Body request: RejectReservationRequest
    ): Response<ReservationResponse>

    @GET("dashboard/prosumer/{nic}")
    suspend fun prosumerDashboard(@Path("nic") nic: String): Response<ProsumerDashboardResponse>

    @GET("dashboard/operator/{stationId}")
    suspend fun operatorDashboard(@Path("stationId") stationId: String): Response<OperatorDashboardResponse>
}
