package com.solargridx.mobile.slots

import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** What the prosumer's QR screen says about the code (display only; the API decides at scan time). */
enum class QrState { VALID, EXPIRED, USED }

object QrStates {

    fun of(reservationStatus: String, expiresAtIso: String?, now: Date): QrState = when {
        reservationStatus == "Completed" -> QrState.USED
        expiresAtIso == null -> QrState.VALID
        parseUtc(expiresAtIso)?.let { !it.after(now) } == true -> QrState.EXPIRED
        else -> QrState.VALID
    }

    /** .NET sends 0–7 fractional digits; those are dropped before parsing. */
    fun parseUtc(iso: String): Date? {
        val normalised = iso.replace(Regex("\\.\\d+"), "").removeSuffix("Z")
        return try {
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.parse(normalised)
        } catch (e: ParseException) {
            null
        }
    }
}

/** Light client-side check before asking the server: SolarGridX codes are base64 JSON tokens. */
object QrTokenFormat {
    private val BASE64 = Regex("^[A-Za-z0-9+/=_-]+$")

    fun looksValid(token: String): Boolean {
        val trimmed = token.trim()
        return trimmed.length in 40..4096 && BASE64.matches(trimmed)
    }
}
