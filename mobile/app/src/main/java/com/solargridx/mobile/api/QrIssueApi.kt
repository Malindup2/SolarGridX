package com.solargridx.mobile.api

import com.solargridx.mobile.dto.QrTokenResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path

/** The transaction QR of an Approved reservation (BR-07). Prosumer, own bookings only. */
interface QrIssueApi {

    @GET("qr/{reservationId}")
    suspend fun get(@Path("reservationId") reservationId: String): Response<QrTokenResponse>
}
