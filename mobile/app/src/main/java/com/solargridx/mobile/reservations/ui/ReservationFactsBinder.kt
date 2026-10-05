package com.solargridx.mobile.reservations.ui

import android.view.LayoutInflater
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import com.solargridx.mobile.R
import com.solargridx.mobile.dto.ReservationResponse

/** Fills a vertical LinearLayout with icon / label / value rows for one reservation. */
object ReservationFactsBinder {

    private data class Row(@DrawableRes val icon: Int, @StringRes val label: Int, val value: String)

    /**
     * @param includeSchedule false where the screen already shows date, slot and
     * energy prominently (the details stat strip), so they aren't repeated.
     */
    fun bind(
        container: LinearLayout,
        reservation: ReservationResponse,
        showNic: Boolean = false,
        includeSchedule: Boolean = true,
        prosumerName: String? = null
    ) {
        val rows = buildList {
            if (includeSchedule) {
                add(Row(R.drawable.ic_res_pin, R.string.res_label_station, reservation.stationName))
                add(Row(R.drawable.ic_res_calendar, R.string.res_label_date, Formatters.slotDate(reservation.reservationDate)))
                add(Row(R.drawable.ic_res_clock, R.string.res_label_slot, Formatters.slotTime(reservation.startTime, reservation.endTime)))
                add(Row(R.drawable.ic_res_bolt, R.string.res_label_energy, Formatters.kwh(reservation.energyKwh)))
            }
            if (showNic) {
                prosumerName?.let { add(Row(R.drawable.ic_res_person, R.string.res_label_prosumer, it)) }
                add(Row(R.drawable.ic_res_badge, R.string.res_label_nic, reservation.nic))
                if (!includeSchedule) add(Row(R.drawable.ic_res_pin, R.string.res_label_station, reservation.stationName))
            }
            reservation.approvedBy?.let {
                val label = if (reservation.status == "Rejected") R.string.res_label_rejected_by else R.string.res_label_approved_by
                add(Row(R.drawable.ic_res_check, label, it))
            }
            reservation.completedAt?.let { add(Row(R.drawable.ic_res_battery, R.string.res_label_completed, Formatters.dateTime(it))) }
            add(Row(R.drawable.ic_res_hourglass, R.string.res_label_booked, Formatters.dateTime(reservation.createdAt)))
            add(Row(R.drawable.ic_res_tag, R.string.res_label_reference, shortReference(reservation.id)))
        }
        render(container, rows)
    }

    /** Same rows from booking inputs, before anything is sent (confirmation and energy input). */
    fun bindDraft(container: LinearLayout, draft: BookingDraft, includeStation: Boolean = false) {
        render(container, buildList {
            if (includeStation) add(Row(R.drawable.ic_res_pin, R.string.res_label_station, draft.stationName))
            add(Row(R.drawable.ic_res_calendar, R.string.res_label_date, Formatters.slotDate(draft.slotDate)))
            add(Row(R.drawable.ic_res_clock, R.string.res_label_slot, Formatters.slotTime(draft.startTime, draft.endTime)))
            draft.energyKwh?.let { add(Row(R.drawable.ic_res_bolt, R.string.res_label_energy, Formatters.kwh(it))) }
        })
    }

    /** Last 8 characters, upper-cased: enough to quote to support, without a wall of hex. */
    fun shortReference(id: String): String = "#" + id.takeLast(8).uppercase()

    private fun render(container: LinearLayout, rows: List<Row>) {
        container.removeAllViews()
        val inflater = LayoutInflater.from(container.context)
        rows.forEach { row ->
            val view = inflater.inflate(R.layout.item_fact, container, false)
            view.findViewById<ImageView>(R.id.factIcon).setImageResource(row.icon)
            view.findViewById<TextView>(R.id.factLabel).setText(row.label)
            view.findViewById<TextView>(R.id.factValue).text = row.value
            container.addView(view)
        }
    }
}
