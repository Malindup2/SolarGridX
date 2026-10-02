package com.solargridx.mobile.reservations.ui

import android.content.Context
import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.StringRes
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import com.google.android.material.progressindicator.LinearProgressIndicator
import com.solargridx.mobile.R
import com.solargridx.mobile.dto.ReservationResponse

/*
 * Where a reservation is in its lifecycle, as a four-stage stepper:
 *   1 Booking requested → 2 Operator review → 3 QR code ready → 4 Energy delivered
 * Rejected and Cancelled stop the line at the stage they happened; later stages
 * are left out. Purely derived from the reservation the API returned.
 */
object ReservationProgress {

    const val TOTAL_STAGES = 4

    enum class State { DONE, CURRENT, UPCOMING, STOPPED }

    data class Step(@StringRes val title: Int, val detail: String?, val state: State)

    data class Model(val steps: List<Step>) {
        /** 1-based stage the reservation is on (or stopped at); TOTAL_STAGES when complete. */
        val stage: Int = steps.indexOfFirst { it.state == State.CURRENT || it.state == State.STOPPED }
            .let { if (it == -1) steps.size else it + 1 }
        val stopped: Boolean = steps.any { it.state == State.STOPPED }
        val complete: Boolean = steps.size == TOTAL_STAGES && steps.all { it.state == State.DONE }

        /** Bar fill: done stages count fully, the current one counts half. */
        val percent: Int = when {
            complete -> 100
            stopped -> stage * 100 / TOTAL_STAGES
            else -> ((stage - 0.5) * 100 / TOTAL_STAGES).toInt()
        }
    }

    fun model(context: Context, r: ReservationResponse): Model {
        val requested = Step(R.string.res_step_requested, Formatters.dateTime(r.createdAt), State.DONE)
        val approved = Step(
            R.string.res_step_review,
            r.approvedBy?.let { context.getString(R.string.res_step_review_approved, it) }
                ?: context.getString(R.string.res_step_review_approved_plain),
            State.DONE
        )
        val qrUpcoming = Step(R.string.res_step_qr, context.getString(R.string.res_step_qr_upcoming), State.UPCOMING)
        val deliveredUpcoming = Step(R.string.res_step_delivered, context.getString(R.string.res_step_delivered_upcoming), State.UPCOMING)

        val steps = when (r.status) {
            "Pending" -> listOf(
                requested,
                Step(R.string.res_step_review, context.getString(R.string.res_step_review_waiting, r.stationName), State.CURRENT),
                qrUpcoming,
                deliveredUpcoming
            )
            "Approved" -> listOf(
                requested,
                approved,
                Step(
                    R.string.res_step_qr,
                    context.getString(
                        R.string.res_step_qr_ready,
                        r.stationName, Formatters.dayChip(r.reservationDate), Formatters.slotTime(r.startTime, r.endTime)
                    ),
                    State.CURRENT
                ),
                deliveredUpcoming
            )
            "Completed" -> listOf(
                requested,
                approved,
                Step(R.string.res_step_qr, context.getString(R.string.res_step_qr_scanned, r.stationName), State.DONE),
                Step(
                    R.string.res_step_delivered,
                    context.getString(R.string.res_step_delivered_done, Formatters.kwh(r.energyKwh), Formatters.dateTime(r.completedAt ?: r.updatedAt)),
                    State.DONE
                )
            )
            "Rejected" -> listOf(
                requested,
                Step(
                    R.string.res_step_rejected,
                    r.approvedBy?.let { context.getString(R.string.res_step_rejected_by, it) },
                    State.STOPPED
                )
            )
            // Cancelled: approvedBy is only set once an operator acted, so it tells us
            // whether the booking was cancelled before or after approval.
            else -> {
                val cancelled = Step(R.string.res_step_cancelled, Formatters.dateTime(r.updatedAt), State.STOPPED)
                if (r.approvedBy != null) listOf(requested, approved, cancelled) else listOf(requested, cancelled)
            }
        }
        return Model(steps)
    }

    /** Fills view_reservation_progress: stage badge, progress bar and the stepper rows. */
    fun bind(card: View, r: ReservationResponse, animate: Boolean) {
        val context = card.context
        val model = model(context, r)
        val tone = StatusStyle.of(r.status)
        fun color(id: Int) = ContextCompat.getColor(context, id)
        fun tint(id: Int) = ColorStateList.valueOf(color(id))

        val badge = card.findViewById<TextView>(R.id.progressBadge)
        badge.text = when {
            model.complete -> context.getString(R.string.res_progress_complete)
            model.stopped -> context.getString(R.string.res_progress_stopped, model.stage)
            else -> context.getString(R.string.res_progress_stage, model.stage, TOTAL_STAGES)
        }
        badge.setTextColor(color(tone.color))
        badge.backgroundTintList = tint(tone.container)

        card.findViewById<LinearProgressIndicator>(R.id.progressBar).apply {
            setIndicatorColor(color(tone.color))
            trackColor = color(tone.container)
            setProgressCompat(model.percent, animate && Motion.enabled(this))
        }

        val list = card.findViewById<LinearLayout>(R.id.progressSteps)
        list.removeAllViews()
        val inflater = LayoutInflater.from(context)
        model.steps.forEachIndexed { index, step ->
            val row = inflater.inflate(R.layout.item_progress_step, list, false)
            val dot = row.findViewById<ImageView>(R.id.stepDot)
            val line = row.findViewById<View>(R.id.stepLine)
            val body = row.findViewById<View>(R.id.stepBody)
            val title = row.findViewById<TextView>(R.id.stepTitle)
            val detail = row.findViewById<TextView>(R.id.stepDetail)

            title.setText(step.title)
            detail.text = step.detail
            detail.isVisible = !step.detail.isNullOrEmpty()

            val muted = color(R.color.color_muted)
            when (step.state) {
                State.DONE -> {
                    dot.backgroundTintList = tint(R.color.status_approved)
                    dot.setImageResource(R.drawable.ic_res_check)
                    dot.imageTintList = tint(R.color.white)
                }
                State.CURRENT -> {
                    dot.backgroundTintList = tint(tone.container)
                    dot.setImageResource(R.drawable.res_step_inner_dot)
                    dot.imageTintList = tint(tone.color)
                    title.setTextColor(color(tone.color))
                    body.backgroundTintList = tint(tone.container)
                }
                State.STOPPED -> {
                    dot.backgroundTintList = tint(tone.color)
                    dot.setImageResource(R.drawable.ic_res_close)
                    dot.imageTintList = tint(R.color.white)
                    title.setTextColor(color(tone.color))
                    body.backgroundTintList = tint(tone.container)
                }
                State.UPCOMING -> {
                    dot.backgroundTintList = tint(R.color.color_border)
                    dot.setImageResource(R.drawable.res_step_inner_dot)
                    dot.imageTintList = tint(R.color.color_surface)
                    title.setTextColor(muted)
                }
            }
            if (step.state != State.CURRENT && step.state != State.STOPPED) body.background = null
            // Connector: solid once the stage is done, quiet otherwise; none after the last row.
            line.isVisible = index < model.steps.lastIndex
            line.backgroundTintList = tint(if (step.state == State.DONE) R.color.status_approved else R.color.color_border)

            row.contentDescription = listOfNotNull(
                context.getString(step.title), step.detail, context.getString(stateLabel(step.state))
            ).joinToString(", ")
            row.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
            title.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
            detail.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
            list.addView(row)
        }
        card.findViewById<View>(R.id.progressHeader).contentDescription =
            context.getString(R.string.res_progress_a11y, badge.text)
    }

    @StringRes
    private fun stateLabel(state: State): Int = when (state) {
        State.DONE -> R.string.res_step_state_done
        State.CURRENT -> R.string.res_step_state_current
        State.UPCOMING -> R.string.res_step_state_upcoming
        State.STOPPED -> R.string.res_step_state_stopped
    }
}
