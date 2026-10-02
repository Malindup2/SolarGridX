package com.solargridx.mobile.api

import com.solargridx.mobile.dto.ProsumerResponse
import com.solargridx.mobile.dto.UpdateProsumerRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.PUT
import retrofit2.http.Path

/** Prosumer profile endpoints. A prosumer may only read / change their own record (NOT_OWN_PROFILE). */
interface ProsumerApi {

    @GET("prosumers/{nic}")
    suspend fun get(@Path("nic") nic: String): Response<ProsumerResponse>

    /** PUT needs the whole object: fullName and email are required (FRONTEND-OWNERSHIP gotcha 6). */
    @PUT("prosumers/{nic}")
    suspend fun update(@Path("nic") nic: String, @Body request: UpdateProsumerRequest): Response<ProsumerResponse>

    /** Self-deactivation; only Backoffice can reactivate (BR-05). */
    @PATCH("prosumers/{nic}/deactivate")
    suspend fun deactivate(@Path("nic") nic: String): Response<ProsumerResponse>
}
