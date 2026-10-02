package com.solargridx.mobile.reservations

import androidx.fragment.app.Fragment
import androidx.navigation.NavOptions
import androidx.navigation.fragment.findNavController
import com.solargridx.mobile.R
import com.solargridx.mobile.dto.ReservationResponse
import com.solargridx.mobile.session.SessionManager

/** Navigation shared by several reservation screens. */
object ReservationNav {

    fun homeDestination(fragment: Fragment): Int =
        if (SessionManager(fragment.requireContext()).getRole() == "GridOperator") R.id.operatorHomeFragment
        else R.id.prosumerHomeFragment

    /**
     * Opens the summary for the call just made. Everything between home and the
     * summary is popped, so Back from the summary goes home and a submitted form
     * can never be submitted again.
     */
    fun toSummary(fragment: Fragment, action: SummaryAction, reservation: ReservationResponse) {
        val options = NavOptions.Builder()
            .setPopUpTo(homeDestination(fragment), false)
            .setEnterAnim(R.anim.res_enter)
            .setExitAnim(R.anim.res_exit)
            .setPopEnterAnim(R.anim.res_pop_enter)
            .setPopExitAnim(R.anim.res_pop_exit)
            .build()
        fragment.findNavController().navigate(
            R.id.bookingSummaryFragment,
            ReservationArgs.summaryBundle(action, reservation),
            options
        )
    }
}
