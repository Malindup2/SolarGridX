package com.solargridx.mobile.api

import com.solargridx.mobile.dto.ProfileResponse
import okhttp3.MultipartBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PUT
import retrofit2.http.Part

/** The signed-in user's own account and profile photo (every role). */
interface ProfileApi {

    @GET("users/me")
    suspend fun me(): Response<ProfileResponse>

    @GET("users/me/avatar")
    suspend fun avatar(): Response<ResponseBody>

    /** JPEG or PNG, at most 1 MB; the API checks the file's own bytes. */
    @Multipart
    @PUT("users/me/avatar")
    suspend fun uploadAvatar(@Part file: MultipartBody.Part): Response<ProfileResponse>

    @DELETE("users/me/avatar")
    suspend fun removeAvatar(): Response<ProfileResponse>
}
