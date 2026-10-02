package com.solargridx.mobile.scan

import android.content.res.ColorStateList
import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.StringRes
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.button.MaterialButton
import com.solargridx.mobile.R
import com.solargridx.mobile.common.FactRows
import com.solargridx.mobile.dto.QrVerifyResponse
import com.solargridx.mobile.reservations.ui.Formatters
import com.solargridx.mobile.reservations.ui.collectWhileStarted
import com.solargridx.mobile.reservations.ui.setupBackToolbar

/**
 * Shows who and what a scanned code is for (POST /qr/preview, read-only), then
 * "Confirm transfer" completes it (POST /qr/verify). Any refusal gets one clear reason.
 */
class QrPreviewFragment : Fragment(R.layout.fragment_qr_preview) {

    private val viewModel: QrPreviewViewModel by viewModels()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupBackToolbar(view, getString(R.string.scan_preview_title))
        val token = requireArguments().getString(QrScanFragment.ARG_TOKEN).orEmpty()

        val progress = view.findViewById<View>(R.id.progress)
        val result = view.findViewById<View>(R.id.resultBlock)
        val card = view.findViewById<View>(R.id.detailsCard)
        val note = view.findViewById<View>(R.id.confirmNote)
        val confirm = view.findViewById<MaterialButton>(R.id.confirmButton)
        val next = view.findViewById<MaterialButton>(R.id.nextButton)

        confirm.setOnClickListener { viewModel.confirm(token) }
        next.setOnClickListener { findNavController().popBackStack() }

        collectWhileStarted(viewModel.state) { state ->
            progress.isVisible = state is ScanState.Checking
            when (state) {
                ScanState.Checking -> {
                    result.isVisible = false
                    card.isVisible = false
                    note.isVisible = false
                    confirm.isVisible = false
                    next.isVisible = false
                }
                is ScanState.Ready, is ScanState.Confirming -> {
                    val booking = (state as? ScanState.Ready)?.booking ?: (state as ScanState.Confirming).booking
                    result.isVisible = false
                    bindFacts(view, booking)
                    card.isVisible = true
                    note.isVisible = true
                    confirm.isVisible = true
                    confirm.isEnabled = state is ScanState.Ready
                    next.isVisible = false
                }
                is ScanState.Completed -> {
                    showResult(view, true, getString(R.string.scan_done_title),
                        getString(R.string.scan_done_body, Formatters.kwh(state.booking.energyKwh), state.booking.prosumerName.ifBlank { state.booking.nic }))
                    bindFacts(view, state.booking)
                    card.isVisible = true
                    note.isVisible = false
                    confirm.isVisible = false
                    next.isVisible = true
                }
                is ScanState.Refused -> {
                    showResult(view, false, getString(R.string.scan_failed_title), getString(messageFor(QrFailure.fromCode(state.error.code)), state.error.message))
                    card.isVisible = false
                    note.isVisible = false
                    confirm.isVisible = false
                    next.isVisible = true
                }
            }
        }

        viewModel.preview(token)
    }

    private fun bindFacts(view: View, booking: QrVerifyResponse) {
        FactRows.bind(
            view.findViewById<LinearLayout>(R.id.factsContainer),
            listOf(
                FactRows.Fact(R.drawable.ic_res_person, getString(R.string.scan_preview_prosumer), "${booking.prosumerName} (${booking.nic})"),
                FactRows.Fact(R.drawable.ic_res_pin, getString(R.string.scan_preview_station), booking.stationName),
                FactRows.Fact(R.drawable.ic_res_clock, getString(R.string.scan_preview_slot), booking.slotTime),
                FactRows.Fact(R.drawable.ic_res_bolt, getString(R.string.scan_preview_energy), Formatters.kwh(booking.energyKwh))
            )
        )
    }

    private fun showResult(view: View, success: Boolean, title: String, body: String) {
        val context = requireContext()
        view.findViewById<View>(R.id.resultBlock).isVisible = true
        view.findViewById<ImageView>(R.id.resultIcon).apply {
            setImageResource(if (success) R.drawable.ic_res_check else R.drawable.ic_res_close)
            imageTintList = ColorStateList.valueOf(ContextCompat.getColor(context, if (success) R.color.status_approved else R.color.status_rejected))
            backgroundTintList = ContextCompat.getColorStateList(context, if (success) R.color.status_approved_container else R.color.status_rejected_container)
        }
        view.findViewById<TextView>(R.id.resultTitle).text = title
        view.findViewById<TextView>(R.id.resultBody).text = body
    }

    /** OTHER falls back to the API's own message (passed as the format argument). */
    @StringRes
    private fun messageFor(failure: QrFailure): Int = when (failure) {
        QrFailure.MALFORMED -> R.string.qr_error_malformed
        QrFailure.SIGNATURE -> R.string.qr_error_signature
        QrFailure.EXPIRED -> R.string.qr_error_expired
        QrFailure.USED -> R.string.qr_error_used
        QrFailure.WRONG_STATION -> R.string.qr_error_station
        QrFailure.SUPERSEDED -> R.string.qr_error_superseded
        QrFailure.NOT_FOUND -> R.string.qr_error_not_found
        QrFailure.NOT_TRANSFERABLE -> R.string.qr_error_not_transferable
        QrFailure.OTHER -> R.string.qr_error_other
    }
}
