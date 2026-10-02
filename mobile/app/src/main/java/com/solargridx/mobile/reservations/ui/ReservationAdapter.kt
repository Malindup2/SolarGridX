package com.solargridx.mobile.reservations.ui

import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.chip.Chip
import com.solargridx.mobile.R
import com.solargridx.mobile.dto.ReservationResponse

/** Binds an `item_reservation` card. Shared by lists and the home screen's next-booking card. */
fun View.bindReservationCard(
    item: ReservationResponse,
    showNic: Boolean = false,
    showDate: Boolean = true,
    names: Map<String, String> = emptyMap(),
    showStation: Boolean = true,
    onClick: () -> Unit
) {
    val style = StatusStyle.of(item.status)
    val title = findViewById<TextView>(R.id.itemTitle)
    val whenText = findViewById<TextView>(R.id.itemWhen)
    val meta = findViewById<TextView>(R.id.itemMeta)
    val status = findViewById<Chip>(R.id.itemStatus)

    // Operators see who booked (name, falling back to NIC) and where; prosumers see the station.
    title.text = if (showNic) names.nameFor(item.nic) else item.stationName
    // Under a day header the date is already shown, so the card only needs the time.
    val time = if (showDate) context.getString(
        R.string.res_when, Formatters.slotDate(item.reservationDate), Formatters.slotTime(item.startTime, item.endTime)
    ) else Formatters.slotTime(item.startTime, item.endTime)
    // Operator cards add the station (or the NIC when the station is already chosen on screen).
    whenText.text = when {
        !showNic -> time
        showStation -> context.getString(R.string.res_when, item.stationName, time)
        else -> context.getString(R.string.res_when, item.nic, time)
    }
    meta.text = Formatters.kwh(item.energyKwh)
    status.bindStatus(item.status)
    findViewById<ImageView>(R.id.itemIcon).apply {
        backgroundTintList = ContextCompat.getColorStateList(context, style.container)
        imageTintList = ColorStateList.valueOf(ContextCompat.getColor(context, style.color))
    }
    setOnClickListener { onClick() }
    contentDescription = "${status.text}, ${title.text}, ${whenText.text}, ${meta.text}"
}

/** One row in a grouped list: a day header or a reservation. */
sealed interface ReservationRow {
    data class Header(val day: String) : ReservationRow
    data class Item(val reservation: ReservationResponse) : ReservationRow
}

/** Groups reservations under day headers, keeping the given order. */
fun List<ReservationResponse>.groupedByDay(): List<ReservationRow> = buildList {
    var lastDay: String? = null
    this@groupedByDay.forEach { reservation ->
        val day = Formatters.dayKey(reservation.reservationDate)
        if (day != lastDay) {
            add(ReservationRow.Header(day))
            lastDay = day
        }
        add(ReservationRow.Item(reservation))
    }
}

/** Reservation cards, optionally under day headers (My bookings, operator queue). */
class ReservationAdapter(
    private val showNic: Boolean = false,
    private val showStation: Boolean = true,
    private val onClick: (ReservationResponse) -> Unit
) : ListAdapter<ReservationRow, RecyclerView.ViewHolder>(Diff) {

    private var grouped = true

    /** NIC → name, for operator cards. Setting it rebinds the visible rows. */
    var names: Map<String, String> = emptyMap()
        set(value) {
            if (field == value) return
            field = value
            notifyItemRangeChanged(0, itemCount)
        }

    fun submitReservations(items: List<ReservationResponse>, grouped: Boolean = true) {
        this.grouped = grouped
        submitList(if (grouped) items.groupedByDay() else items.map { ReservationRow.Item(it) })
    }

    private class HeaderHolder(view: View) : RecyclerView.ViewHolder(view)
    private class ItemHolder(view: View) : RecyclerView.ViewHolder(view)

    override fun getItemViewType(position: Int) = when (getItem(position)) {
        is ReservationRow.Header -> TYPE_HEADER
        is ReservationRow.Item -> TYPE_ITEM
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return if (viewType == TYPE_HEADER) HeaderHolder(inflater.inflate(R.layout.item_day_header, parent, false))
        else ItemHolder(inflater.inflate(R.layout.item_reservation, parent, false))
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (val row = getItem(position)) {
            is ReservationRow.Header -> (holder.itemView as TextView).text = Formatters.slotDate(row.day)
            is ReservationRow.Item -> holder.itemView.bindReservationCard(row.reservation, showNic, showDate = !grouped, names = names, showStation = showStation) {
                onClick(row.reservation)
            }
        }
    }

    private object Diff : DiffUtil.ItemCallback<ReservationRow>() {
        override fun areItemsTheSame(old: ReservationRow, new: ReservationRow) = when {
            old is ReservationRow.Header && new is ReservationRow.Header -> old.day == new.day
            old is ReservationRow.Item && new is ReservationRow.Item -> old.reservation.id == new.reservation.id
            else -> false
        }
        override fun areContentsTheSame(old: ReservationRow, new: ReservationRow) = old == new
    }

    private companion object {
        const val TYPE_HEADER = 0
        const val TYPE_ITEM = 1
    }
}
