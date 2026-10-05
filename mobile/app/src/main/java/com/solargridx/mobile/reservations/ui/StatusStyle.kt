package com.solargridx.mobile.reservations.ui

import android.content.res.ColorStateList
import android.widget.TextView
import androidx.annotation.ColorRes
import androidx.annotation.StringRes
import androidx.core.content.ContextCompat
import com.google.android.material.chip.Chip
import com.solargridx.mobile.R

/** Maps a reservation status to its label and the semantic status colours. */
enum class StatusStyle(@StringRes val label: Int, @ColorRes val color: Int, @ColorRes val container: Int) {
    PENDING(R.string.res_status_pending, R.color.status_pending, R.color.status_pending_container),
    APPROVED(R.string.res_status_approved, R.color.status_approved, R.color.status_approved_container),
    COMPLETED(R.string.res_status_completed, R.color.status_completed, R.color.status_completed_container),
    REJECTED(R.string.res_status_rejected, R.color.status_rejected, R.color.status_rejected_container),
    CANCELLED(R.string.res_status_cancelled, R.color.status_cancelled, R.color.status_cancelled_container);

    companion object {
        fun of(status: String): StatusStyle = when (status) {
            "Approved" -> APPROVED
            "Completed" -> COMPLETED
            "Rejected" -> REJECTED
            "Cancelled" -> CANCELLED
            else -> PENDING
        }
    }
}

/** Status pill: tinted container, coloured text, and the label so colour is never the only signal. */
fun Chip.bindStatus(status: String) {
    val style = StatusStyle.of(status)
    text = context.getString(style.label)
    setTextColor(ContextCompat.getColor(context, style.color))
    chipBackgroundColor = ContextCompat.getColorStateList(context, style.container)
    chipStrokeWidth = 0f
    isClickable = false
    isCheckable = false
    contentDescription = context.getString(R.string.res_cd_status, text)
}

fun TextView.tintStatus(status: String) {
    setTextColor(ColorStateList.valueOf(ContextCompat.getColor(context, StatusStyle.of(status).color)))
}
