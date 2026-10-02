package com.solargridx.mobile.reservations.booking

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.progressindicator.LinearProgressIndicator
import com.solargridx.mobile.R
import com.solargridx.mobile.dto.EnergyBookingSlot
import com.solargridx.mobile.reservations.ui.Formatters

/**
 * Slot cards. `capacityKwh` is the maximum for ONE booking and `reservedCount`
 * counts battery bays, not energy (FRONTEND-OWNERSHIP gotcha 2), so the bar
 * shows bays taken out of the station's bay count.
 */
class SlotAdapter(
    var bayCount: Int,
    private val onClick: (EnergyBookingSlot) -> Unit
) : ListAdapter<EnergyBookingSlot, SlotAdapter.Holder>(Diff) {

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        val time: TextView = view.findViewById(R.id.slotTime)
        val capacity: TextView = view.findViewById(R.id.slotCapacity)
        val offline: TextView = view.findViewById(R.id.slotOffline)
        val chevron: View = view.findViewById(R.id.slotChevron)
        val bays: LinearProgressIndicator = view.findViewById(R.id.slotBays)
        val baysText: TextView = view.findViewById(R.id.slotBaysText)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        Holder(LayoutInflater.from(parent.context).inflate(R.layout.item_slot, parent, false))

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val slot = getItem(position)
        val context = holder.itemView.context
        holder.time.text = Formatters.slotTime(slot.startTime, slot.endTime)
        holder.capacity.text = context.getString(R.string.res_energy_helper, Formatters.kwh(slot.capacityKwh))
        holder.bays.max = bayCount.coerceAtLeast(1)
        holder.bays.setProgressCompat(slot.reservedCount.coerceAtMost(holder.bays.max), false)
        holder.baysText.text = context.resources.getQuantityString(
            R.plurals.res_bays_reserved, bayCount, slot.reservedCount, bayCount
        )

        holder.offline.isVisible = !slot.isAvailable
        holder.chevron.isVisible = slot.isAvailable
        holder.itemView.isEnabled = slot.isAvailable
        holder.itemView.alpha = if (slot.isAvailable) 1f else 0.55f
        holder.itemView.setOnClickListener { if (slot.isAvailable) onClick(slot) }
        holder.itemView.contentDescription = listOfNotNull(
            holder.time.text, holder.capacity.text, holder.baysText.text,
            context.getString(R.string.res_slot_unavailable).takeIf { !slot.isAvailable }
        ).joinToString(", ")
    }

    private object Diff : DiffUtil.ItemCallback<EnergyBookingSlot>() {
        override fun areItemsTheSame(old: EnergyBookingSlot, new: EnergyBookingSlot) = old.id == new.id
        override fun areContentsTheSame(old: EnergyBookingSlot, new: EnergyBookingSlot) = old == new
    }
}
