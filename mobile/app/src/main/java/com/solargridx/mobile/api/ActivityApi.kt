package com.solargridx.mobile.api

import com.solargridx.mobile.dto.NotificationInbox
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/** The signed-in user's notifications. */
interface ActivityApi {

    @GET("notifications")
    suspend fun inbox(): Response<NotificationInbox>

    @POST("notifications/{id}/read")
    suspend fun markRead(@Path("id") id: String): Response<Unit>

    @POST("notifications/read-all")
    suspend fun markAllRead(): Response<Unit>
}
