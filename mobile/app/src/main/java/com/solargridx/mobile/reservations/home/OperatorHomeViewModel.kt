package com.solargridx.mobile.reservations.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.dto.OperatorDashboardResponse
import com.solargridx.mobile.dto.SolarStationInfo
import com.solargridx.mobile.reservations.data.ReservationRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class OperatorHomeViewModel(
    private val repository: ReservationRepository = ReservationRepository()
) : ViewModel() {

    private val _stations = MutableStateFlow<UiState<List<SolarStationInfo>>>(UiState.Loading)
    val stations: StateFlow<UiState<List<SolarStationInfo>>> = _stations.asStateFlow()

    /** null until a station is picked (operators aren't assigned to one). */
    private val _dashboard = MutableStateFlow<UiState<OperatorDashboardResponse>?>(null)
    val dashboard: StateFlow<UiState<OperatorDashboardResponse>?> = _dashboard.asStateFlow()

    var selectedStationId: String? = null
        private set

    /** Today's numbers, next transfer and charts for the chosen station; null until loaded or if they could not be read. */
    private val _insights = MutableStateFlow<OperatorInsights?>(null)
    val insights: StateFlow<OperatorInsights?> = _insights.asStateFlow()

    private var insightsJob: Job? = null

    /** NIC → name so the queue shows who booked, not just a number. */
    private val _names = MutableStateFlow<Map<String, String>>(emptyMap())
    val names: StateFlow<Map<String, String>> = _names.asStateFlow()

    var query: String = ""

    private var dashboardJob: Job? = null

    fun loadStations() {
        viewModelScope.launch { _names.value = repository.prosumerNames() }
        if (_stations.value is UiState.Content) return
        _stations.value = UiState.Loading
        viewModelScope.launch {
            _stations.value = when (val result = repository.stations()) {
                is ApiResult.Success -> UiState.Content(result.data)
                is ApiResult.Failure -> UiState.Error(result.error)
            }
        }
    }

    fun selectStation(stationId: String) {
        selectedStationId = stationId
        refresh()
    }

    fun refresh() {
        val stationId = selectedStationId ?: return
        // Keep the current numbers on screen while refreshing the same station.
        val current = _dashboard.value
        if (current !is UiState.Content || current.data.stationId != stationId) _dashboard.value = UiState.Loading
        dashboardJob?.cancel()
        dashboardJob = viewModelScope.launch {
            _dashboard.value = when (val result = repository.operatorDashboard(stationId)) {
                is ApiResult.Success -> UiState.Content(result.data)
                is ApiResult.Failure -> UiState.Error(result.error)
            }
        }
        loadInsights(stationId)
    }

    // The extra numbers only decorate the home screen, so a failure leaves them out instead of showing an error.
    private fun loadInsights(stationId: String) {
        if (_insights.value != null && selectedStationIdOfInsights != stationId) _insights.value = null
        insightsJob?.cancel()
        insightsJob = viewModelScope.launch {
            val reservations = async { repository.stationReservations(stationId) }
            val slots = async { repository.stationSlots(stationId) }
            val bookings = (reservations.await() as? ApiResult.Success)?.data
            if (bookings == null) {
                _insights.value = null
                return@launch
            }
            val bays = (_stations.value as? UiState.Content)?.data?.firstOrNull { it.id == stationId }?.batterySlotCount ?: 0
            selectedStationIdOfInsights = stationId
            _insights.value = OperatorInsights.of(bookings, (slots.await() as? ApiResult.Success)?.data.orEmpty(), bays)
        }
    }

    private var selectedStationIdOfInsights: String? = null
}
