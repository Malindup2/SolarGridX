package com.solargridx.mobile.reservations.booking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solargridx.mobile.common.ActionState
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.dto.EnergyBookingSlot
import com.solargridx.mobile.dto.ReservationResponse
import com.solargridx.mobile.dto.SolarStationInfo
import com.solargridx.mobile.reservations.data.ReservationRepository
import com.solargridx.mobile.reservations.data.SlotOpenings
import com.solargridx.mobile.reservations.ui.Formatters
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Slots of one station grouped by day; the screen shows one day at a time. */
data class StationSlots(val station: SolarStationInfo, val days: List<String>, val byDay: Map<String, List<EnergyBookingSlot>>)

class SlotPickerViewModel(
    private val repository: ReservationRepository = ReservationRepository()
) : ViewModel() {

    private val _stations = MutableStateFlow<UiState<List<SolarStationInfo>>>(UiState.Loading)
    val stations: StateFlow<UiState<List<SolarStationInfo>>> = _stations.asStateFlow()

    private val _slots = MutableStateFlow<UiState<StationSlots>?>(null)
    val slots: StateFlow<UiState<StationSlots>?> = _slots.asStateFlow()

    private val _reschedule = MutableStateFlow<ActionState<ReservationResponse>>(ActionState.Idle)
    val reschedule: StateFlow<ActionState<ReservationResponse>> = _reschedule.asStateFlow()

    var selectedDay: String? = null
    private var slotsJob: Job? = null

    fun loadStations() {
        if (_stations.value is UiState.Content) return
        _stations.value = UiState.Loading
        viewModelScope.launch {
            _stations.value = when (val result = repository.stations()) {
                is ApiResult.Failure -> UiState.Error(result.error)
                is ApiResult.Success -> {
                    // Only active stations with a slot open to book are offered, so picking a
                    // station never leads to an empty screen.
                    UiState.Content(SlotOpenings.withOpenSlots(result.data.filter { it.status == "Active" }))
                }
            }
        }
    }

    fun selectStation(station: SolarStationInfo) {
        if ((_slots.value as? UiState.Content)?.data?.station?.id == station.id) return
        selectedDay = null
        _slots.value = UiState.Loading
        slotsJob?.cancel()
        slotsJob = viewModelScope.launch {
            _slots.value = when (val result = repository.stationSlots(station.id)) {
                is ApiResult.Failure -> UiState.Error(result.error)
                is ApiResult.Success -> {
                    // Only days inside the 7-day window with something still bookable get a chip;
                    // on those days, started or full slots stay visible but disabled.
                    val bays = station.batterySlotCount
                    val byDay = result.data
                        .filter { SlotOpenings.inWindow(it) }
                        .groupBy { Formatters.dayKey(it.slotDate) }
                        .filterValues { slots -> slots.any { SlotOpenings.isBookable(it, bays) } }
                        .mapValues { (_, slots) -> slots.sortedBy { it.startTime } }
                        .toSortedMap()
                    UiState.Content(StationSlots(station, byDay.keys.toList(), byDay))
                }
            }
        }
    }

    fun reschedule(reservationId: String, slotId: String, expectedUpdatedAt: String? = null) {
        if (_reschedule.value is ActionState.Running) return
        _reschedule.value = ActionState.Running
        viewModelScope.launch {
            _reschedule.value = when (val result = repository.reschedule(reservationId, slotId, expectedUpdatedAt)) {
                is ApiResult.Success -> ActionState.Done(result.data)
                is ApiResult.Failure -> ActionState.Failed(result.error)
            }
        }
    }

    fun consumeReschedule() {
        _reschedule.value = ActionState.Idle
    }
}
