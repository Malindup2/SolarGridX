package com.solargridx.mobile.slots

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.TextView
import androidx.core.view.children
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.google.android.material.materialswitch.MaterialSwitch
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputLayout
import com.solargridx.mobile.R
import com.solargridx.mobile.common.StateViews
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.common.displayText
import com.solargridx.mobile.dto.EnergyBookingSlot
import com.solargridx.mobile.dto.SolarStationInfo
import com.solargridx.mobile.reservations.ReservationArgs
import com.solargridx.mobile.reservations.ui.Formatters
import com.solargridx.mobile.reservations.ui.collectWhileStarted
import com.solargridx.mobile.reservations.ui.setupBackToolbar

/**
 * Operator slot update from the phone: pick a station and day, then switch slots
 * offline for maintenance or back online. Generating and editing slots stays on the web.
 */
class OperatorSlotsFragment : Fragment(R.layout.fragment_operator_slots) {

    private val viewModel: OperatorSlotsViewModel by viewModels()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupBackToolbar(view, getString(R.string.slots_title))

        val stationLayout = view.findViewById<TextInputLayout>(R.id.stationLayout)
        val stationInput = view.findViewById<AutoCompleteTextView>(R.id.stationInput)
        val dayScroller = view.findViewById<View>(R.id.dayScroller)
        val dayChips = view.findViewById<ChipGroup>(R.id.dayChips)
        val list = view.findViewById<RecyclerView>(R.id.slotList)
        val states = StateViews(view) { viewModel.loadStations() }
        val adapter = SlotSwitchAdapter { slot, available -> viewModel.setAvailability(slot, available) }
        list.layoutManager = LinearLayoutManager(requireContext())
        list.adapter = adapter

        var stations: List<SolarStationInfo> = emptyList()
        stationInput.setOnItemClickListener { _, _, position, _ -> viewModel.selectStation(stations[position]) }

        collectWhileStarted(viewModel.stations) { state ->
            when (state) {
                is UiState.Loading -> { stationLayout.isEnabled = false; states.showLoading() }
                is UiState.Error -> { stationLayout.isEnabled = false; states.showError(state.error) }
                is UiState.Content -> {
                    stations = state.data
                    stationLayout.isEnabled = true
                    stationInput.setAdapter(ArrayAdapter(requireContext(), android.R.layout.simple_list_item_1, stations.map { it.stationName }))
                    if (viewModel.slots.value == null) {
                        val requested = arguments?.getString(ReservationArgs.STATION_ID)
                        (stations.firstOrNull { it.id == requested } ?: stations.firstOrNull())?.let { viewModel.selectStation(it) }
                    }
                }
            }
        }

        fun showDay(data: StationDays, day: String) {
            viewModel.selectedDay = day
            val slots = data.byDay[day].orEmpty()
            adapter.bays = data.station.batterySlotCount
            adapter.submit(slots)
            list.isVisible = slots.isNotEmpty()
            if (slots.isEmpty()) states.showEmpty(getString(R.string.slots_empty_title), getString(R.string.slots_empty_body)) else states.hide()
        }

        collectWhileStarted(viewModel.slots) { state ->
            when (state) {
                null -> Unit
                is UiState.Loading -> { list.isVisible = false; dayScroller.isVisible = false; states.showLoading() }
                is UiState.Error -> { list.isVisible = false; dayScroller.isVisible = false; states.showError(state.error) }
                is UiState.Content -> {
                    val data = state.data
                    stationInput.setText(data.station.stationName, false)
                    val days = data.byDay.keys.toList()
                    if (days.isEmpty()) {
                        dayScroller.isVisible = false
                        list.isVisible = false
                        states.showEmpty(getString(R.string.slots_empty_title), getString(R.string.slots_empty_body))
                        return@collectWhileStarted
                    }
                    val day = viewModel.selectedDay?.takeIf { it in data.byDay } ?: days.first()
                    if (dayChips.childCount != days.size || dayChips.children.map { it.tag }.toList() != days) {
                        dayChips.setOnCheckedStateChangeListener(null)
                        dayChips.removeAllViews()
                        days.forEach { d ->
                            val chip = layoutInflater.inflate(R.layout.item_day_chip, dayChips, false) as Chip
                            chip.text = Formatters.dayChip(d)
                            chip.contentDescription = Formatters.slotDate(d)
                            chip.tag = d
                            chip.id = View.generateViewId()
                            dayChips.addView(chip)
                        }
                    }
                    dayChips.children.firstOrNull { it.tag == day }?.let { dayChips.check(it.id) }
                    dayChips.setOnCheckedStateChangeListener { group, ids ->
                        val chip = ids.firstOrNull()?.let { group.findViewById<Chip>(it) } ?: return@setOnCheckedStateChangeListener
                        showDay(data, chip.tag as String)
                    }
                    dayScroller.isVisible = true
                    showDay(data, day)
                }
            }
        }

        collectWhileStarted(viewModel.toggles) { result ->
            val message = when (result) {
                is ToggleResult.Done -> {
                    val time = Formatters.slotTime(result.slot.startTime, result.slot.endTime)
                    getString(if (result.slot.isAvailable) R.string.slots_toggled_online else R.string.slots_toggled_offline, time)
                }
                is ToggleResult.Failed -> {
                    // Put the switch back by re-rendering from the unchanged state.
                    (viewModel.slots.value as? UiState.Content)?.data?.let { data -> viewModel.selectedDay?.let { showDay(data, it) } }
                    result.error.displayText()
                }
            }
            Snackbar.make(view, message, Snackbar.LENGTH_LONG).show()
        }

        viewModel.loadStations()
    }
}

private class SlotSwitchAdapter(private val onToggle: (EnergyBookingSlot, Boolean) -> Unit) :
    RecyclerView.Adapter<SlotSwitchAdapter.Holder>() {

    var bays: Int = 0
    private var items: List<EnergyBookingSlot> = emptyList()

    fun submit(slots: List<EnergyBookingSlot>) {
        items = slots
        @Suppress("NotifyDataSetChanged") // a day's list is small and replaced wholesale
        notifyDataSetChanged()
    }

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        val time: TextView = view.findViewById(R.id.slotTime)
        val facts: TextView = view.findViewById(R.id.slotFacts)
        val switch: MaterialSwitch = view.findViewById(R.id.slotSwitch)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        Holder(LayoutInflater.from(parent.context).inflate(R.layout.item_operator_slot, parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val slot = items[position]
        val context = holder.itemView.context
        val time = Formatters.slotTime(slot.startTime, slot.endTime)
        holder.time.text = time
        holder.facts.text = context.getString(R.string.slots_item, Formatters.kwh(slot.capacityKwh), slot.reservedCount, bays)
        holder.switch.setOnCheckedChangeListener(null)
        holder.switch.isChecked = slot.isAvailable
        holder.switch.text = context.getString(if (slot.isAvailable) R.string.slots_online else R.string.slots_offline)
        holder.switch.contentDescription = "$time, ${holder.switch.text}"
        holder.switch.setOnCheckedChangeListener { _, checked -> onToggle(slot, checked) }
    }
}
