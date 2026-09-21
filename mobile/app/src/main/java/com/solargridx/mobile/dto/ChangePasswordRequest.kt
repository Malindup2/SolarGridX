package com.solargridx.mobile.dto

data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)
