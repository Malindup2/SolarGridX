package com.solargridx.mobile.scan

/** Why a scanned code was refused, from the API's error code (one message per reason). */
enum class QrFailure {
    MALFORMED, SIGNATURE, EXPIRED, USED, WRONG_STATION, SUPERSEDED, NOT_FOUND, NOT_TRANSFERABLE, OTHER;

    companion object {
        fun fromCode(code: String?): QrFailure = when (code) {
            "QR_TOKEN_MALFORMED" -> MALFORMED
            "QR_SIGNATURE_INVALID" -> SIGNATURE
            "QR_TOKEN_EXPIRED" -> EXPIRED
            "QR_TOKEN_ALREADY_USED" -> USED
            "QR_STATION_MISMATCH" -> WRONG_STATION
            "QR_TOKEN_SUPERSEDED" -> SUPERSEDED
            "RESERVATION_NOT_FOUND" -> NOT_FOUND
            "RESERVATION_NOT_TRANSFERABLE", "RESERVATION_NOT_APPROVED" -> NOT_TRANSFERABLE
            else -> OTHER
        }
    }
}
