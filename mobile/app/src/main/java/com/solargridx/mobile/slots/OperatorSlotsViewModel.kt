package com.solargridx.mobile.slots

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.SlotApi
import com.solargridx.mobile.api.StationApi
import com.solargridx.mobile.common.ApiError
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.common.safeApiCall
import com.solargridx.mobile.dto.EnergyBookingSlot
import com.solargridx.mobile.dto.SlotAvailabilityRequest
import com.solargridx.mobile.dto.SolarStationInfo
import com.solargridx.mobile.reservations.ui.Formatters
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class StationDays(val station: SolarStationInfo, val byDay: Map<String, List<EnergyBookingSlot>>)

/** What happened when a switch was flipped, for a snackbar. */
sealed interface ToggleResult {
    data class Done(val slot: EnergyBookingSlot) : ToggleResult
    data class Failed(val error: ApiError) : ToggleResult
}

class OperatorSlotsViewModel(
    private val stationApi: StationApi = ApiClient.retrofit.create(StationApi::class.java),
    private val slotApi: SlotApi = ApiClient.retrofit.create(SlotApi::class.java)
) : ViewModel() {

    private val _stations = MutableStateFlow<UiState<List<SolarStationInfo>>>(UiState.Loading)
    val stations: StateFlow<UiState<List<SolarStationInfo>>> = _stations.asStateFlow()

    private val _slots = MutableStateFlow<UiState<StationDays>?>(null)
    val slots: StateFlow<UiState<StationDays>?> = _slots.asStateFlow()

    private val _toggles = MutableSharedFlow<ToggleResult>(extraBufferCapacity = 4)
    val toggles: SharedFlow<ToggleResult> = _toggles.asSharedFlow()

    var selectedDay: String? = null

    fun loadStations() {
        if (_stations.value is UiState.Content) return
        viewModelScope.launch {
            _stations.value = when (val result = safeApiCall { stationApi.all() }) {
                is ApiResult.Success -> UiState.Content(result.data.sortedBy { it.stationName.lowercase() })
                is ApiResult.Failure -> UiState.Error(result.error)
            }
        }
    }

    fun selectStation(station: SolarStationInfo, keepDay: Boolean = false) {
        if (!keepDay) selectedDay = null
        _slots.value = UiState.Loading
        viewModelScope.launch {
            _slots.value = when (val result = safeApiCall { slotApi.forStation(station.id) }) {
                is ApiResult.Failure -> UiState.Error(result.error)
                is ApiResult.Success -> {
                    // Today onwards: yesterday's slots can't be changed in any useful way.
                    val today = Formatters.todayKey()
                    val byDay = result.data
                        .filter { Formatters.dayKey(it.slotDate) >= today }
                        .groupBy { Formatters.dayKey(it.slotDate) }
                        .mapValues { (_, slots) -> slots.sortedBy { it.startTime } }
                        .toSortedMap()
                    UiState.Content(StationDays(station, byDay))
                }
            }
        }
    }

    fun setAvailability(slot: EnergyBookingSlot, available: Boolean) {
        viewModelScope.launch {
            when (val result = safeApiCall { slotApi.setAvailability(slot.id, SlotAvailabilityRequest(available)) }) {
                is ApiResult.Success -> {
                    // Patch the one slot in place so the list doesn't jump.
                    val current = (_slots.value as? UiState.Content)?.data
                    if (current != null) {
                        val day = Formatters.dayKey(slot.slotDate)
                        val updated = current.byDay[day].orEmpty().map { if (it.id == slot.id) it.copy(isAvailable = available) else it }
                        _slots.value = UiState.Content(current.copy(byDay = current.byDay + (day to updated)))
                    }
                    _toggles.emit(ToggleResult.Done(slot.copy(isAvailable = available)))
                }
                is ApiResult.Failure -> _toggles.emit(ToggleResult.Failed(result.error))
            }
        }
    }
}
