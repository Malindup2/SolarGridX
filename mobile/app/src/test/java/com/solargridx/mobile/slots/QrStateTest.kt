package com.solargridx.mobile.slots

import com.solargridx.mobile.scan.QrFailure
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Date

class QrStateTest {

    private val now = QrStates.parseUtc("2026-10-05T09:30:00Z")!!

    @Test
    fun aCompletedBookingsCodeIsUsed() {
        assertEquals(QrState.USED, QrStates.of("Completed", "2026-10-05T10:00:00Z", now))
    }

    @Test
    fun aCodeIsValidUntilItsSlotEnds() {
        assertEquals(QrState.VALID, QrStates.of("Approved", "2026-10-05T10:00:00Z", now))
        assertEquals(QrState.EXPIRED, QrStates.of("Approved", "2026-10-05T09:30:00Z", now))
        assertEquals(QrState.EXPIRED, QrStates.of("Approved", "2026-10-05T09:00:00.1234567Z", now))
    }

    @Test
    fun aMissingExpiryIsTreatedAsValid() {
        assertEquals(QrState.VALID, QrStates.of("Approved", null, Date()))
    }

    @Test
    fun parseUtc_acceptsDotNetFractionsAndRejectsGarbage() {
        assertNotNull(QrStates.parseUtc("2026-10-05T10:00:00.1234567Z"))
        assertNull(QrStates.parseUtc("not a date"))
    }

    @Test
    fun tokenFormat_acceptsBase64AndRejectsObviousNoise() {
        val token = "eyJyZXNJZCI6IjY3MTBhM2I0IiwibmljIjoiMTk5ODEyMzQ1Njc4IiwiZXhwIjoiMjAyNiJ9"
        assertTrue(QrTokenFormat.looksValid(token))
        assertTrue(QrTokenFormat.looksValid("  $token  "))
        assertFalse(QrTokenFormat.looksValid("https://example.com/not-a-solargridx-code"))
        assertFalse(QrTokenFormat.looksValid("short"))
        assertFalse(QrTokenFormat.looksValid(""))
    }

    @Test
    fun everyApiRefusalMapsToOneReason() {
        assertEquals(QrFailure.MALFORMED, QrFailure.fromCode("QR_TOKEN_MALFORMED"))
        assertEquals(QrFailure.SIGNATURE, QrFailure.fromCode("QR_SIGNATURE_INVALID"))
        assertEquals(QrFailure.EXPIRED, QrFailure.fromCode("QR_TOKEN_EXPIRED"))
        assertEquals(QrFailure.USED, QrFailure.fromCode("QR_TOKEN_ALREADY_USED"))
        assertEquals(QrFailure.WRONG_STATION, QrFailure.fromCode("QR_STATION_MISMATCH"))
        assertEquals(QrFailure.SUPERSEDED, QrFailure.fromCode("QR_TOKEN_SUPERSEDED"))
        assertEquals(QrFailure.NOT_FOUND, QrFailure.fromCode("RESERVATION_NOT_FOUND"))
        assertEquals(QrFailure.NOT_TRANSFERABLE, QrFailure.fromCode("RESERVATION_NOT_TRANSFERABLE"))
        assertEquals(QrFailure.NOT_TRANSFERABLE, QrFailure.fromCode("RESERVATION_NOT_APPROVED"))
        assertEquals(QrFailure.OTHER, QrFailure.fromCode("NETWORK_ERROR"))
        assertEquals(QrFailure.OTHER, QrFailure.fromCode(null))
    }
}
