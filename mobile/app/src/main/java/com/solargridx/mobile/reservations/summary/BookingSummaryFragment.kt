package com.solargridx.mobile.reservations.summary

import com.solargridx.mobile.reservations.ui.riseIn
import com.solargridx.mobile.reservations.ui.popIn
import androidx.core.view.children
import android.view.ViewGroup
import android.content.res.ColorStateList
import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.ColorRes
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.navigation.NavOptions
import androidx.navigation.fragment.findNavController
import com.google.android.material.chip.Chip
import com.solargridx.mobile.R
import com.solargridx.mobile.reservations.ReservationArgs
import com.solargridx.mobile.reservations.ReservationNav
import com.solargridx.mobile.reservations.SummaryAction
import com.solargridx.mobile.reservations.ui.ReservationFactsBinder
import com.solargridx.mobile.reservations.ui.bindStatus

/**
 * The summary after every reservation action: create, update, reschedule,
 * cancel (prosumer) and approve / reject (operator). It shows the response of
 * the call just made, so what you see is exactly what the server saved.
 */
class BookingSummaryFragment : Fragment(R.layout.fragment_booking_summary) {

    private data class Copy(
        @StringRes val title: Int,
        @StringRes val body: Int,
        @DrawableRes val icon: Int,
        @ColorRes val color: Int,
        @ColorRes val container: Int
    )

    private fun copyFor(action: SummaryAction) = when (action) {
        SummaryAction.CREATED -> Copy(R.string.res_summary_created_title, R.string.res_summary_created_body, R.drawable.ic_res_check, R.color.status_approved, R.color.status_approved_container)
        SummaryAction.UPDATED -> Copy(R.string.res_summary_updated_title, R.string.res_summary_updated_body, R.drawable.ic_res_edit, R.color.status_completed, R.color.status_completed_container)
        SummaryAction.RESCHEDULED -> Copy(R.string.res_summary_rescheduled_title, R.string.res_summary_rescheduled_body, R.drawable.ic_res_calendar, R.color.status_completed, R.color.status_completed_container)
        SummaryAction.CANCELLED -> Copy(R.string.res_summary_cancelled_title, R.string.res_summary_cancelled_body, R.drawable.ic_res_close, R.color.status_cancelled, R.color.status_cancelled_container)
        SummaryAction.APPROVED -> Copy(R.string.res_summary_approved_title, R.string.res_summary_approved_body, R.drawable.ic_res_check, R.color.status_approved, R.color.status_approved_container)
        SummaryAction.REJECTED -> Copy(R.string.res_summary_rejected_title, R.string.res_summary_rejected_body, R.drawable.ic_res_close, R.color.status_rejected, R.color.status_rejected_container)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val reservation = ReservationArgs.reservationFrom(arguments)
        val action = arguments?.getString(ReservationArgs.SUMMARY_ACTION)
            ?.let { runCatching { SummaryAction.valueOf(it) }.getOrNull() }
        if (reservation == null || action == null) {
            goHome()
            return
        }

        val copy = copyFor(action)
        val context = requireContext()
        view.findViewById<ImageView>(R.id.summaryIcon).apply {
            setImageResource(copy.icon)
            imageTintList = ColorStateList.valueOf(ContextCompat.getColor(context, copy.color))
            backgroundTintList = ContextCompat.getColorStateList(context, copy.container)
        }
        view.findViewById<TextView>(R.id.summaryTitle).setText(copy.title)
        view.findViewById<TextView>(R.id.summaryBody).setText(copy.body)
        view.findViewById<Chip>(R.id.summaryStatus).bindStatus(reservation.status)

        val isOperatorAction = action == SummaryAction.APPROVED || action == SummaryAction.REJECTED
        ReservationFactsBinder.bind(view.findViewById<LinearLayout>(R.id.factsContainer), reservation, showNic = isOperatorAction)

        val reason = reservation.rejectionReason
        view.findViewById<View>(R.id.summaryReasonLabel).isVisible = reason != null
        view.findViewById<TextView>(R.id.summaryReason).apply {
            isVisible = reason != null
            text = reason
        }

        // The outcome icon pops, then the rest of the page rises in after it.
        if (savedInstanceState == null) {
            val icon = view.findViewById<View>(R.id.summaryIcon)
            icon.popIn(80)
            ((icon.parent) as ViewGroup).children.filter { it !== icon }.forEachIndexed { i, child -> child.riseIn(200L + i * 50L) }
        }

        // Announce the outcome for screen reader users as the screen opens.
        view.announceForAccessibility(getString(copy.title))

        view.findViewById<View>(R.id.viewButton).setOnClickListener {
            val destination = if (isOperatorAction) R.id.operatorReviewFragment else R.id.bookingDetailsFragment
            // Replace the summary so Back from the booking goes home, not to the summary again.
            val options = NavOptions.Builder()
                .setPopUpTo(R.id.bookingSummaryFragment, true)
                .setEnterAnim(R.anim.res_enter)
                .setExitAnim(R.anim.res_exit)
                .setPopEnterAnim(R.anim.res_pop_enter)
                .setPopExitAnim(R.anim.res_pop_exit)
                .build()
            findNavController().navigate(destination, ReservationArgs.idBundle(reservation.id), options)
        }
        view.findViewById<View>(R.id.homeButton).setOnClickListener { goHome() }
    }

    private fun goHome() {
        val nav = findNavController()
        if (!nav.popBackStack(ReservationNav.homeDestination(this), false)) nav.navigate(ReservationNav.homeDestination(this))
    }
}
