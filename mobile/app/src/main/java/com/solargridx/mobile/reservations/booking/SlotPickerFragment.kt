package com.solargridx.mobile.reservations.booking

import com.solargridx.mobile.reservations.ui.cascadeIn
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputLayout
import com.solargridx.mobile.R
import com.solargridx.mobile.common.ActionState
import com.solargridx.mobile.common.StateViews
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.common.displayText
import com.solargridx.mobile.dto.EnergyBookingSlot
import com.solargridx.mobile.dto.SolarStationInfo
import com.solargridx.mobile.reservations.ReservationArgs
import com.solargridx.mobile.reservations.ReservationNav
import com.solargridx.mobile.reservations.SummaryAction
import com.solargridx.mobile.reservations.ui.BookingDraft
import com.solargridx.mobile.reservations.ui.Formatters
import com.solargridx.mobile.reservations.ui.collectWhileStarted
import com.solargridx.mobile.reservations.ui.setupBackToolbar

/**
 * Slot selection: a station, a day and the slots on that day. Choosing a slot passes
 * stationId, slotId, slotDate, startTime, endTime and capacityKwh to energy input.
 *
 * Also used to pick the new slot when rescheduling (mode = reschedule).
 */
class SlotPickerFragment : Fragment(R.layout.fragment_slot_picker) {

    private val viewModel: SlotPickerViewModel by viewModels()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val rescheduleId = arguments?.getString(ReservationArgs.RESERVATION_ID)
            ?.takeIf { arguments?.getString(ReservationArgs.PICKER_MODE) == ReservationArgs.MODE_RESCHEDULE }

        setupBackToolbar(view, getString(if (rescheduleId != null) R.string.res_reschedule_title else R.string.res_slot_picker_title))

        val stationLayout = view.findViewById<TextInputLayout>(R.id.stationLayout)
        val stationInput = view.findViewById<AutoCompleteTextView>(R.id.stationInput)
        val dayScroller = view.findViewById<View>(R.id.dayScroller)
        val dayChips = view.findViewById<ChipGroup>(R.id.dayChips)
        val slotList = view.findViewById<RecyclerView>(R.id.slotList)
        val states = StateViews(view) { viewModel.loadStations() }

        var currentStation: SolarStationInfo? = null
        val adapter = SlotAdapter(bayCount = 0) { slot ->
            val station = currentStation ?: return@SlotAdapter
            if (rescheduleId != null) confirmReschedule(rescheduleId, station, slot) else openEnergyInput(station, slot)
        }
        slotList.layoutManager = LinearLayoutManager(requireContext())
        slotList.adapter = adapter

        var stations: List<SolarStationInfo> = emptyList()
        stationInput.setOnItemClickListener { _, _, position, _ -> viewModel.selectStation(stations[position]) }

        collectWhileStarted(viewModel.stations) { state ->
            when (state) {
                is UiState.Loading -> { stationLayout.isEnabled = false; states.showLoading() }
                is UiState.Error -> { stationLayout.isEnabled = false; states.showError(state.error) }
                is UiState.Content -> {
                    stations = state.data
                    stationLayout.isEnabled = true
                    stationInput.setAdapter(
                        ArrayAdapter(requireContext(), android.R.layout.simple_list_item_1, stations.map { it.stationName })
                    )
                    // Start on the station handed over from its details screen, else the first one,
                    // so the screen never opens empty.
                    if (viewModel.slots.value == null) {
                        val requested = arguments?.getString(ReservationArgs.STATION_ID)
                        (stations.firstOrNull { it.id == requested } ?: stations.firstOrNull())?.let { viewModel.selectStation(it) } ?: states.showEmpty(
                            getString(R.string.res_no_stations_title), getString(R.string.res_no_stations_body)
                        )
                    }
                }
            }
        }

        fun showDay(data: StationSlots, day: String) {
            viewModel.selectedDay = day
            val slots = data.byDay[day].orEmpty()
            adapter.submitList(slots)
            slotList.cascadeIn()
            slotList.isVisible = slots.isNotEmpty()
            if (slots.isEmpty()) states.showEmpty(getString(R.string.res_no_slots_title), getString(R.string.res_no_slots_body))
            else states.hide()
        }

        collectWhileStarted(viewModel.slots) { state ->
            when (state) {
                null -> Unit
                is UiState.Loading -> {
                    dayScroller.isVisible = false
                    slotList.isVisible = false
                    states.showLoading()
                }
                is UiState.Error -> {
                    dayScroller.isVisible = false
                    slotList.isVisible = false
                    states.showError(state.error)
                }
                is UiState.Content -> {
                    val data = state.data
                    currentStation = data.station
                    adapter.bayCount = data.station.batterySlotCount
                    stationInput.setText(data.station.stationName, false)
                    if (data.days.isEmpty()) {
                        dayScroller.isVisible = false
                        slotList.isVisible = false
                        states.showEmpty(getString(R.string.res_no_slots_station_title), getString(R.string.res_no_slots_station_body))
                        return@collectWhileStarted
                    }
                    dayChips.removeAllViews()
                    data.days.forEach { day ->
                        val chip = layoutInflater.inflate(R.layout.item_day_chip, dayChips, false) as Chip
                        chip.text = Formatters.dayChip(day)
                        chip.contentDescription = Formatters.slotDate(day)
                        chip.tag = day
                        chip.id = View.generateViewId()
                        dayChips.addView(chip)
                    }
                    dayScroller.isVisible = true
                    val day = viewModel.selectedDay?.takeIf { it in data.byDay } ?: data.days.first()
                    dayChips.children().firstOrNull { it.tag == day }?.let { dayChips.check(it.id) }
                    dayChips.setOnCheckedStateChangeListener { group, ids ->
                        val chip = ids.firstOrNull()?.let { group.findViewById<Chip>(it) } ?: return@setOnCheckedStateChangeListener
                        showDay(data, chip.tag as String)
                    }
                    showDay(data, day)
                }
            }
        }

        collectWhileStarted(viewModel.reschedule) { state ->
            when (state) {
                is ActionState.Done -> {
                    viewModel.consumeReschedule()
                    ReservationNav.toSummary(this, SummaryAction.RESCHEDULED, state.data)
                }
                is ActionState.Failed -> {
                    viewModel.consumeReschedule()
                    MaterialAlertDialogBuilder(requireContext(), R.style.ThemeOverlay_SolarGridX_Res_Dialog)
                        .setTitle(R.string.res_reschedule)
                        .setMessage(state.error.displayText())
                        .setPositiveButton(android.R.string.ok, null)
                        .show()
                }
                else -> Unit
            }
        }

        viewModel.loadStations()
    }

    private fun openEnergyInput(station: SolarStationInfo, slot: EnergyBookingSlot) {
        val draft = BookingDraft(
            stationId = station.id,
            stationName = station.stationName,
            slotId = slot.id,
            slotDate = slot.slotDate,
            startTime = slot.startTime,
            endTime = slot.endTime,
            capacityKwh = slot.capacityKwh
        )
        findNavController().navigate(R.id.action_slotPicker_to_energyInput, ReservationArgs.draftBundle(draft))
    }

    private fun confirmReschedule(reservationId: String, station: SolarStationInfo, slot: EnergyBookingSlot) {
        MaterialAlertDialogBuilder(requireContext(), R.style.ThemeOverlay_SolarGridX_Res_Dialog)
            .setTitle(R.string.res_reschedule_confirm_title)
            .setMessage(
                getString(
                    R.string.res_reschedule_confirm_body,
                    station.stationName,
                    "${Formatters.slotDate(slot.slotDate)}, ${Formatters.slotTime(slot.startTime, slot.endTime)}"
                )
            )
            .setNegativeButton(R.string.btn_cancel, null)
            .setPositiveButton(R.string.res_reschedule) { _, _ ->
                viewModel.reschedule(reservationId, slot.id, arguments?.getString(ReservationArgs.EXPECTED_UPDATED_AT))
            }
            .show()
    }

    private fun ChipGroup.children(): List<View> = (0 until childCount).map { getChildAt(it) }
}
