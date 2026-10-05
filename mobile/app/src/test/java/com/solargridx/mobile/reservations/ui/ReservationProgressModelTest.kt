package com.solargridx.mobile.reservations.ui

import com.solargridx.mobile.reservations.ui.ReservationProgress.Model
import com.solargridx.mobile.reservations.ui.ReservationProgress.State
import com.solargridx.mobile.reservations.ui.ReservationProgress.Step
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** The stage / percent arithmetic behind the booking progress stepper (no Android views involved). */
class ReservationProgressModelTest {

    private fun model(vararg states: State) = Model(states.map { Step(title = 0, detail = null, state = it) })

    @Test
    fun pending_isOnStageTwoAndHalfwayThroughIt() {
        val m = model(State.DONE, State.CURRENT, State.UPCOMING, State.UPCOMING)

        assertEquals(2, m.stage)
        assertFalse(m.stopped)
        assertFalse(m.complete)
        assertEquals(37, m.percent) // (2 - 0.5) / 4
    }

    @Test
    fun approved_isOnStageThree() {
        val m = model(State.DONE, State.DONE, State.CURRENT, State.UPCOMING)

        assertEquals(3, m.stage)
        assertEquals(62, m.percent) // (3 - 0.5) / 4
    }

    @Test
    fun completed_isCompleteAtOneHundredPercent() {
        val m = model(State.DONE, State.DONE, State.DONE, State.DONE)

        assertTrue(m.complete)
        assertFalse(m.stopped)
        assertEquals(ReservationProgress.TOTAL_STAGES, m.stage)
        assertEquals(100, m.percent)
    }

    @Test
    fun rejected_stopsTheLineAtReview() {
        val m = model(State.DONE, State.STOPPED)

        assertTrue(m.stopped)
        assertFalse(m.complete)
        assertEquals(2, m.stage)
        assertEquals(50, m.percent)
    }

    @Test
    fun cancelledAfterApproval_stopsAtTheThirdRow() {
        val m = model(State.DONE, State.DONE, State.STOPPED)

        assertTrue(m.stopped)
        assertEquals(3, m.stage)
        assertEquals(75, m.percent)
    }

    @Test
    fun aShortDoneOnlyListIsNotComplete() {
        // Completeness needs all four stages; two done rows are not "delivered".
        val m = model(State.DONE, State.DONE)

        assertFalse(m.complete)
    }
}
