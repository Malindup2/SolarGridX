package com.solargridx.mobile.reservations.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class StatusStyleTest {

    @Test
    fun mapsEveryApiStatusToItsStyle() {
        assertEquals(StatusStyle.PENDING, StatusStyle.of("Pending"))
        assertEquals(StatusStyle.APPROVED, StatusStyle.of("Approved"))
        assertEquals(StatusStyle.COMPLETED, StatusStyle.of("Completed"))
        assertEquals(StatusStyle.REJECTED, StatusStyle.of("Rejected"))
        assertEquals(StatusStyle.CANCELLED, StatusStyle.of("Cancelled"))
    }

    @Test
    fun anUnknownStatusIsShownAsPending() {
        assertEquals(StatusStyle.PENDING, StatusStyle.of("Mystery"))
        assertEquals(StatusStyle.PENDING, StatusStyle.of(""))
    }

    @Test
    fun statusMatchingIsCaseSensitiveLikeTheApiEnum() {
        assertNotEquals(StatusStyle.APPROVED, StatusStyle.of("approved"))
    }

    @Test
    fun everyStatusHasItsOwnLabelAndColour() {
        val styles = StatusStyle.values()

        assertEquals(styles.size, styles.map { it.label }.toSet().size)
        assertEquals(styles.size, styles.map { it.color }.toSet().size)
    }
}
