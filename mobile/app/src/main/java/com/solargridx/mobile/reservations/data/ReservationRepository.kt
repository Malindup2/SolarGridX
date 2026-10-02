package com.solargridx.mobile.reservations.data

import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.ReservationApi
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.safeApiCall
import com.solargridx.mobile.dto.CreateReservationRequest
import com.solargridx.mobile.dto.EnergyBookingSlot
import com.solargridx.mobile.dto.OperatorDashboardResponse
import com.solargridx.mobile.dto.ProsumerDashboardResponse
import com.solargridx.mobile.dto.ProsumerStatusResponse
import com.solargridx.mobile.dto.RejectReservationRequest
import com.solargridx.mobile.dto.RescheduleReservationRequest
import com.solargridx.mobile.dto.ReservationResponse
import com.solargridx.mobile.dto.SolarStationInfo
import com.solargridx.mobile.dto.UpdateReservationRequest

/** Single entry point the reservation ViewModels use; every call returns an ApiResult. */
class ReservationRepository(
    private val api: ReservationApi = ApiClient.retrofit.create(ReservationApi::class.java),
    private val lookups: ReservationLookupApi = ApiClient.retrofit.create(ReservationLookupApi::class.java)
) {

    suspend fun create(request: CreateReservationRequest): ApiResult<ReservationResponse> =
        safeApiCall { api.create(request) }

    suspend fun myReservations(): ApiResult<List<ReservationResponse>> = safeApiCall { api.list() }

    suspend fun get(id: String): ApiResult<ReservationResponse> = safeApiCall { api.get(id) }

    suspend fun updateEnergy(id: String, energyKwh: Double, expectedUpdatedAt: String? = null): ApiResult<ReservationResponse> =
        safeApiCall { api.updateEnergy(id, UpdateReservationRequest(energyKwh, expectedUpdatedAt)) }

    suspend fun reschedule(id: String, slotId: String, expectedUpdatedAt: String? = null): ApiResult<ReservationResponse> =
        safeApiCall { api.reschedule(id, RescheduleReservationRequest(slotId, expectedUpdatedAt)) }

    suspend fun cancel(id: String): ApiResult<ReservationResponse> = safeApiCall { api.cancel(id) }

    suspend fun approve(id: String): ApiResult<ReservationResponse> = safeApiCall { api.approve(id) }

    suspend fun reject(id: String, reason: String): ApiResult<ReservationResponse> =
        safeApiCall { api.reject(id, RejectReservationRequest(reason.trim())) }

    suspend fun prosumerDashboard(nic: String): ApiResult<ProsumerDashboardResponse> =
        safeApiCall { api.prosumerDashboard(nic) }

    suspend fun operatorDashboard(stationId: String): ApiResult<OperatorDashboardResponse> =
        safeApiCall { api.operatorDashboard(stationId) }

    suspend fun stations(): ApiResult<List<SolarStationInfo>> = safeApiCall { lookups.stations() }

    suspend fun stationSlots(stationId: String): ApiResult<List<EnergyBookingSlot>> =
        safeApiCall { lookups.stationSlots(stationId) }

    suspend fun prosumer(nic: String): ApiResult<ProsumerStatusResponse> = safeApiCall { lookups.prosumer(nic) }

    /**
     * NIC → full name for operator screens. Cached for the app session; a
     * failure just means cards fall back to showing the NIC.
     */
    suspend fun prosumerNames(forceRefresh: Boolean = false): Map<String, String> {
        if (!forceRefresh && nameCache.isNotEmpty()) return nameCache
        val result = safeApiCall { lookups.prosumers() }
        if (result is ApiResult.Success) nameCache = result.data.associate { it.nic.uppercase() to it.fullName }
        return nameCache
    }

    private companion object {
        @Volatile var nameCache: Map<String, String> = emptyMap()
    }
}
