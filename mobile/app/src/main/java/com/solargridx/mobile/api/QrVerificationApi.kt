package com.solargridx.mobile.api

import com.solargridx.mobile.dto.QrVerifyRequest
import com.solargridx.mobile.dto.QrVerifyResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/** Grid Operator scanning at the station. */
interface QrVerificationApi {

    /** Read-only: shows the booking behind a scanned code. Never completes anything. */
    @POST("qr/preview")
    suspend fun preview(@Body request: QrVerifyRequest): Response<QrVerifyResponse>

    /** Verifies the code and finalises the transfer (Approved -> Completed, BR-08). */
    @POST("qr/verify")
    suspend fun verify(@Body request: QrVerifyRequest): Response<QrVerifyResponse>
}
