package com.solargridx.mobile.stations

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.solargridx.mobile.R
import com.solargridx.mobile.reservations.ui.Formatters

class StationAdapter(private val onClick: (StationDistance) -> Unit) :
    ListAdapter<StationDistance, StationAdapter.Holder>(Diff) {

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        val name: TextView = view.findViewById(R.id.stationName)
        val distance: TextView = view.findViewById(R.id.stationDistance)
        val address: TextView = view.findViewById(R.id.stationAddress)
        val facts: TextView = view.findViewById(R.id.stationFacts)
        val closed: TextView = view.findViewById(R.id.stationClosed)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        Holder(LayoutInflater.from(parent.context).inflate(R.layout.item_station, parent, false))

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val item = getItem(position)
        val station = item.station
        val context = holder.itemView.context

        holder.name.text = station.stationName
        holder.address.text = station.location
        holder.distance.isVisible = item.km != null
        holder.distance.text = item.km?.let { StationGeo.formatDistance(it) }
        holder.facts.text = context.getString(
            R.string.stations_facts,
            Formatters.kwh(station.capacityKwh),
            station.batterySlotCount,
            station.operationalSchedule.openTime,
            station.operationalSchedule.closeTime
        )
        holder.closed.isVisible = station.status != "Active"
        holder.itemView.contentDescription = listOfNotNull(
            station.stationName,
            item.km?.let { StationGeo.formatDistance(it) },
            station.location,
            holder.facts.text,
            if (station.status != "Active") context.getString(R.string.stations_inactive) else null
        ).joinToString(", ")
        holder.itemView.setOnClickListener { onClick(item) }
    }

    private object Diff : DiffUtil.ItemCallback<StationDistance>() {
        override fun areItemsTheSame(old: StationDistance, new: StationDistance) = old.station.id == new.station.id
        override fun areContentsTheSame(old: StationDistance, new: StationDistance) = old == new
    }
}
