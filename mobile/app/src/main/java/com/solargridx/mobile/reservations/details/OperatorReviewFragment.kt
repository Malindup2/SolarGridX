package com.solargridx.mobile.reservations.details

import android.text.InputType
import com.solargridx.mobile.R
import com.solargridx.mobile.dto.ReservationResponse

/**
 * Operator review of one reservation: approve (issues the QR) or reject with a
 * reason. Only Pending reservations can be decided; anything else returns 409
 * RESERVATION_ALREADY_DECIDED, which is shown inline.
 */
class OperatorReviewFragment : BaseReservationDetailFragment() {

    override val titleRes = R.string.res_review_title
    override val showNic = true

    override fun statusNote(reservation: ReservationResponse) =
        if (reservation.status == "Pending") "" else getString(R.string.res_already_decided)

    override fun bindActions(reservation: ReservationResponse, actions: Actions) {
        if (reservation.status != "Pending") return
        actions.primary.show(R.string.res_approve, R.drawable.ic_res_check) {
            confirm(
                title = R.string.res_approve_confirm_title,
                message = getString(R.string.res_approve_confirm_body),
                positive = R.string.res_approve
            ) { viewModel.approve() }
        }
        actions.danger.show(R.string.res_reject) {
            promptText(
                title = R.string.res_reject_title,
                hint = R.string.res_reject_reason_hint,
                positive = R.string.res_reject,
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES,
                maxLength = REASON_MAX,
                validate = { if (it.isBlank()) getString(R.string.res_reject_reason_required) else null },
                onValid = { viewModel.reject(it) }
            )
        }
    }

    private companion object {
        const val REASON_MAX = 500
    }
}
