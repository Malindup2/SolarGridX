package com.solargridx.mobile.dto

data class RegisterRequest(
    val nic: String,
    val password: String,
    val fullName: String,
    val email: String?,
    val phone: String?,
    val address: String?
)
