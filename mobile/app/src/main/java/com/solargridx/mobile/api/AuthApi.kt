package com.solargridx.mobile.api

import com.solargridx.mobile.dto.ChangePasswordRequest
import com.solargridx.mobile.dto.LoginRequest
import com.solargridx.mobile.dto.LoginResponse
import com.solargridx.mobile.dto.RegisterRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST


interface AuthApi {

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<Unit>

    @POST("auth/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): Response<Unit>

    @POST("auth/logout")
    suspend fun logout(): Response<Unit>
}
