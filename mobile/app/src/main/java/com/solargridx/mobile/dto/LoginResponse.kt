package com.solargridx.mobile.dto

data class LoginResponse(
    val token: String,
    val role: String,
    val nic: String?,
    val displayName: String,
    val homeRoute: String,
    val status: String? = null,
    val mustChangePassword: Boolean = false
)
