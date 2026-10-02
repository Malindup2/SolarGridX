package com.solargridx.mobile.reservations.booking

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.fragment.app.viewModels
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.solargridx.mobile.R
import com.solargridx.mobile.common.ActionState
import com.solargridx.mobile.common.displayText
import com.solargridx.mobile.reservations.ReservationArgs
import com.solargridx.mobile.reservations.ReservationNav
import com.solargridx.mobile.reservations.SummaryAction
import com.solargridx.mobile.reservations.ui.Formatters
import com.solargridx.mobile.reservations.ui.ReservationFactsBinder
import com.solargridx.mobile.reservations.ui.collectWhileStarted
import com.solargridx.mobile.session.SessionManager

/**
 * Review-before-submit as a bottom sheet over energy input, then
 * POST /reservations and on to the summary.
 */
class BookingConfirmFragment : BottomSheetDialogFragment() {

    private val viewModel: BookingConfirmViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View =
        inflater.inflate(R.layout.fragment_booking_confirm, container, false)

    override fun onStart() {
        super.onStart()
        // Open fully so the confirm button is never below the fold.
        (dialog as? BottomSheetDialog)?.behavior?.apply {
            state = BottomSheetBehavior.STATE_EXPANDED
            skipCollapsed = true
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val draft = ReservationArgs.draftFrom(arguments)
        val nic = SessionManager(requireContext()).getNic()
        if (draft?.energyKwh == null || nic == null) {
            dismiss()
            return
        }

        view.findViewById<TextView>(R.id.stationName).text = draft.stationName
        view.findViewById<TextView>(R.id.capacityNote).text =
            getString(R.string.res_energy_helper, Formatters.kwh(draft.capacityKwh))
        ReservationFactsBinder.bindDraft(view.findViewById<LinearLayout>(R.id.factsContainer), draft)

        val confirm = view.findViewById<View>(R.id.confirmButton)
        val cancel = view.findViewById<View>(R.id.editButton)
        val progress = view.findViewById<View>(R.id.progress)
        val errorCard = view.findViewById<View>(R.id.inlineError)
        val errorText = view.findViewById<TextView>(R.id.inlineErrorText)

        confirm.setOnClickListener { viewModel.submit(nic, draft) }
        cancel.setOnClickListener { dismiss() }

        collectWhileStarted(viewModel.submit) { state ->
            val running = state is ActionState.Running
            confirm.isEnabled = !running
            cancel.isEnabled = !running
            isCancelable = !running
            progress.isVisible = running
            when (state) {
                is ActionState.Failed -> {
                    errorCard.isVisible = true
                    errorText.text = state.error.displayText()
                }
                is ActionState.Done -> {
                    viewModel.consume()
                    ReservationNav.toSummary(this, SummaryAction.CREATED, state.data)
                }
                ActionState.Running -> errorCard.isVisible = false
                ActionState.Idle -> Unit
            }
        }
    }
}
