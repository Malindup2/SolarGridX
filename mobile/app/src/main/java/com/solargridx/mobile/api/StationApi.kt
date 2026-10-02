package com.solargridx.mobile.api

import com.solargridx.mobile.dto.SolarStationInfo
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

/** Microgrid nodes (M3). Every signed-in role can read them. */
interface StationApi {

    @GET("stations")
    suspend fun all(): Response<List<SolarStationInfo>>

    /** Active stations within the radius, nearest first (server-calculated). */
    @GET("stations/nearby")
    suspend fun nearby(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("radiusKm") radiusKm: Double
    ): Response<List<SolarStationInfo>>

    @GET("stations/{id}")
    suspend fun get(@Path("id") id: String): Response<SolarStationInfo>
}
