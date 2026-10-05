package com.solargridx.mobile.api

import com.solargridx.mobile.dto.ChangePasswordRequest
import com.solargridx.mobile.dto.ForgotPasswordRequest
import com.solargridx.mobile.dto.MessageResponse
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

    /** Returns a fresh session: the change ends every older token, this device's included. */
    @POST("auth/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): Response<LoginResponse>

    /** Always the same answer, whether or not the email has an account. The reset happens on the web. */
    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<MessageResponse>

    @POST("auth/logout")
    suspend fun logout(): Response<Unit>
}
