package com.solargridx.mobile.slots

import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeEncoder
import com.solargridx.mobile.R
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.QrIssueApi
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.StateViews
import com.solargridx.mobile.common.safeApiCall
import com.solargridx.mobile.reservations.ReservationArgs
import com.solargridx.mobile.reservations.data.ReservationRepository
import com.solargridx.mobile.reservations.ui.Formatters
import com.solargridx.mobile.reservations.ui.setupBackToolbar
import kotlinx.coroutines.launch
import java.util.Date

/**
 * The prosumer's transaction QR (M4) for an Approved booking (BR-07). The operator scans
 * it at the station; the server verifies it and completes the transfer (BR-08).
 * Opened from booking details with `reservationId` (M1 → M4 hand-off).
 */
class QrDisplayFragment : Fragment(R.layout.fragment_qr_display) {

    private lateinit var states: StateViews

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupBackToolbar(view, getString(R.string.qr_title))
        val id = requireArguments().getString(ReservationArgs.RESERVATION_ID).orEmpty()
        states = StateViews(view) { load(view, id) }
        view.findViewById<MaterialButton>(R.id.refreshButton).setOnClickListener { load(view, id) }
        load(view, id)
    }

    override fun onResume() {
        super.onResume()
        // Full brightness makes the code easier to scan.
        requireActivity().window.attributes = requireActivity().window.attributes.apply { screenBrightness = 1f }
        requireActivity().window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    override fun onPause() {
        requireActivity().window.attributes = requireActivity().window.attributes.apply {
            screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
        }
        requireActivity().window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        super.onPause()
    }

    private fun load(view: View, id: String) {
        val content = view.findViewById<View>(R.id.content)
        content.isVisible = false
        states.showLoading()

        viewLifecycleOwner.lifecycleScope.launch {
            val reservation = when (val result = ReservationRepository().get(id)) {
                is ApiResult.Failure -> return@launch states.showError(result.error)
                is ApiResult.Success -> result.data
            }
            val qr = when (val result = safeApiCall { ApiClient.retrofit.create(QrIssueApi::class.java).get(id) }) {
                is ApiResult.Failure -> return@launch states.showError(result.error)
                is ApiResult.Success -> result.data
            }

            val size = resources.displayMetrics.widthPixels.coerceAtMost(900)
            view.findViewById<ImageView>(R.id.qrImage).setImageBitmap(
                BarcodeEncoder().encodeBitmap(qr.qrToken, BarcodeFormat.QR_CODE, size, size)
            )
            view.findViewById<TextView>(R.id.qrHeadline).text = reservation.stationName
            view.findViewById<TextView>(R.id.qrSlot).text =
                "${Formatters.slotDate(reservation.reservationDate)} · ${Formatters.slotTime(reservation.startTime, reservation.endTime)} · ${Formatters.kwh(reservation.energyKwh)}"
            view.findViewById<TextView>(R.id.qrInstructions).text = getString(R.string.qr_instructions, reservation.stationName)

            val state = QrStates.of(reservation.status, qr.expiresAt, Date())
            view.findViewById<TextView>(R.id.qrState).apply {
                text = when (state) {
                    QrState.VALID -> getString(R.string.qr_state_valid, Formatters.dateTime(qr.expiresAt))
                    QrState.EXPIRED -> getString(R.string.qr_state_expired)
                    QrState.USED -> getString(R.string.qr_state_used)
                }
                setTextColor(ContextCompat.getColor(requireContext(), if (state == QrState.VALID) R.color.status_approved else R.color.status_cancelled))
            }
            // A used or expired code is shown faded so nobody tries to scan it.
            view.findViewById<ImageView>(R.id.qrImage).alpha = if (state == QrState.VALID) 1f else 0.25f

            states.hide()
            content.isVisible = true
        }
    }
}
