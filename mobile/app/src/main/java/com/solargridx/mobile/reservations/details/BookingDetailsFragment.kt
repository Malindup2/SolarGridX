package com.solargridx.mobile.reservations.details

import android.text.InputType
import androidx.core.os.bundleOf
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.solargridx.mobile.R
import com.solargridx.mobile.dto.ReservationResponse
import com.solargridx.mobile.reservations.ReservationArgs

/**
 * Prosumer booking details for every status.
 *   Pending:   edit energy (PUT), reschedule (PATCH .../reschedule), cancel
 *   Approved:  show QR, change (energy or slot; sends it back to Pending, BR-16), cancel
 *   Rejected:  the operator's reason
 *   Completed: the transfer completion view
 */
class BookingDetailsFragment : BaseReservationDetailFragment() {

    override val titleRes = R.string.res_details_title

    override fun statusNote(reservation: ReservationResponse) = when (reservation.status) {
        "Pending" -> getString(R.string.res_pending_note)
        "Approved" -> getString(R.string.res_approved_note)
        else -> ""
    }

    override fun bindActions(reservation: ReservationResponse, actions: Actions) {
        when (reservation.status) {
            "Pending" -> {
                actions.primary.show(R.string.res_edit_energy, R.drawable.ic_res_edit) { editEnergy(reservation) }
                actions.secondary.show(R.string.res_reschedule, R.drawable.ic_res_calendar) { reschedule(reservation) }
                actions.danger.show(R.string.res_cancel_booking) { cancel() }
            }
            "Approved" -> {
                actions.primary.show(R.string.res_show_qr, R.drawable.ic_res_qr) { showQr(reservation) }
                actions.secondary.show(R.string.res_change_booking, R.drawable.ic_res_edit) { changeApproved(reservation) }
                actions.danger.show(R.string.res_cancel_booking) { cancel() }
            }
        }
    }

    /**
     * An approved booking can still be changed, but it goes back to Pending and its QR code stops
     * working. The user is told that first, then picks what to change.
     */
    private fun changeApproved(reservation: ReservationResponse) {
        MaterialAlertDialogBuilder(requireContext(), R.style.ThemeOverlay_SolarGridX_Res_Dialog)
            .setTitle(R.string.res_change_booking)
            .setMessage(R.string.res_change_approved_warning)
            .setNegativeButton(R.string.btn_cancel, null)
            .setItems(arrayOf(getString(R.string.res_edit_energy), getString(R.string.res_reschedule))) { _, which ->
                if (which == 0) editEnergy(reservation) else reschedule(reservation)
            }
            .show()
    }

    private fun editEnergy(reservation: ReservationResponse) {
        promptText(
            title = R.string.res_edit_energy_title,
            hint = R.string.res_energy_hint,
            positive = R.string.res_save,
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL,
            initial = reservation.energyKwh.toBigDecimal().stripTrailingZeros().toPlainString(),
            validate = { value ->
                val number = value.toDoubleOrNull()
                when {
                    value.isEmpty() -> getString(R.string.res_energy_required)
                    number == null || number <= 0 -> getString(R.string.res_energy_positive)
                    else -> null
                }
            },
            onValid = { viewModel.updateEnergy(it.toDouble()) }
        )
    }

    private fun reschedule(reservation: ReservationResponse) {
        findNavController().navigate(
            R.id.action_bookingDetails_to_slotPicker,
            bundleOf(
                ReservationArgs.PICKER_MODE to ReservationArgs.MODE_RESCHEDULE,
                ReservationArgs.RESERVATION_ID to reservation.id,
                ReservationArgs.EXPECTED_UPDATED_AT to reservation.updatedAt
            )
        )
    }

    private fun cancel() {
        confirm(
            title = R.string.res_cancel_confirm_title,
            message = getString(R.string.res_cancel_confirm_body),
            positive = R.string.res_cancel_booking,
            destructive = true
        ) { viewModel.cancel() }
    }

    /** Opens the QR screen for this booking with `reservationId`. */
    private fun showQr(reservation: ReservationResponse) {
        findNavController().navigate(R.id.qrDisplayFragment, ReservationArgs.idBundle(reservation.id))
    }
}
