package com.solargridx.mobile.dto

/** api/DTOs/Prosumers: ProsumerResponse and UpdateProsumerRequest. */
data class ProsumerResponse(
    val nic: String,
    val fullName: String,
    val email: String,
    val phone: String?,
    val address: String?,
    val status: String,
    val createdAt: String,
    val updatedAt: String
)

data class UpdateProsumerRequest(
    val fullName: String,
    val email: String,
    val phone: String?,
    val address: String?
)
