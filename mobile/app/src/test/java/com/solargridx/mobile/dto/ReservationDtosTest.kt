package com.solargridx.mobile.dto

import com.google.gson.Gson
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The DTOs are parsed by Gson with no extra configuration, so a renamed field breaks the
 * screens silently. These pin the JSON the API actually sends (api/DTOs/Reservations).
 */
class ReservationDtosTest {

    private val gson = Gson()

    @Test
    fun parsesAReservationResponse() {
        val json = """
            {"id":"6710a3b4","nic":"199812345678","stationId":"s1","stationName":"Negombo Solar Hub",
             "slotId":"sl1","reservationDate":"2026-10-03T00:00:00Z","startTime":"09:00","endTime":"10:00",
             "slotTime":"2026-10-03 09:00-10:00","energyKwh":12.5,"status":"Approved","qrEligible":true,
             "approvedBy":"Nimal","rejectionReason":null,"completedAt":null,
             "createdAt":"2026-10-01T08:14:22Z","updatedAt":"2026-10-01T09:00:00Z"}
        """.trimIndent()

        val r = gson.fromJson(json, ReservationResponse::class.java)

        assertEquals("6710a3b4", r.id)
        assertEquals("Negombo Solar Hub", r.stationName)
        assertEquals(12.5, r.energyKwh, 0.0)
        assertEquals("Approved", r.status)
        assertTrue(r.qrEligible)
        assertEquals("Nimal", r.approvedBy)
        assertNull(r.rejectionReason)
        assertNull(r.completedAt)
    }

    @Test
    fun parsesTheOperatorDashboardWithItsPendingQueue() {
        val json = """
            {"stationId":"s1","stationName":"Negombo","pendingCount":1,"approvedFutureCount":4,
             "pendingReservations":[{"id":"r1","nic":"199812345678","stationId":"s1","stationName":"Negombo",
              "slotId":"sl1","reservationDate":"2026-10-03T00:00:00Z","startTime":"09:00","endTime":"10:00",
              "slotTime":"x","energyKwh":10,"status":"Pending","qrEligible":false,"approvedBy":null,
              "rejectionReason":null,"completedAt":null,"createdAt":"2026-10-01T08:14:22Z","updatedAt":"2026-10-01T08:14:22Z"}]}
        """.trimIndent()

        val d = gson.fromJson(json, OperatorDashboardResponse::class.java)

        assertEquals(1, d.pendingCount)
        assertEquals(4, d.approvedFutureCount)
        assertEquals("r1", d.pendingReservations.single().id)
        assertFalse(d.pendingReservations.single().qrEligible)
    }

    @Test
    fun parsesTheProsumerDashboard() {
        val d = gson.fromJson(
            """{"nic":"199812345678","activeCount":3,"pendingCount":1,"approvedFutureCount":2}""",
            ProsumerDashboardResponse::class.java
        )

        assertEquals(3, d.activeCount)
        assertEquals(1, d.pendingCount)
        assertEquals(2, d.approvedFutureCount)
    }

    @Test
    fun serialisesTheCreateRequestWithTheNamesTheApiExpects() {
        val json = gson.toJson(
            CreateReservationRequest("199812345678", "s1", "sl1", "2026-10-03", "09:00", "10:00", 12.5)
        )

        assertEquals(
            """{"nic":"199812345678","stationId":"s1","slotId":"sl1","reservationDate":"2026-10-03","startTime":"09:00","endTime":"10:00","energyKwh":12.5}""",
            json
        )
    }

    @Test
    fun serialisesTheSmallRequests() {
        assertEquals("""{"energyKwh":20.0}""", gson.toJson(UpdateReservationRequest(20.0)))
        assertEquals("""{"slotId":"sl2"}""", gson.toJson(RescheduleReservationRequest("sl2")))
        assertEquals("""{"reason":"Maintenance"}""", gson.toJson(RejectReservationRequest("Maintenance")))
    }
}
