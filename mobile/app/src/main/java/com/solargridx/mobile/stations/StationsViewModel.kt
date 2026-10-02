package com.solargridx.mobile.stations

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.StationApi
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.common.safeApiCall
import com.solargridx.mobile.dto.SolarStationInfo
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Where the user is, when they allowed location. */
data class UserLocation(val lat: Double, val lng: Double)

data class StationsData(val stations: List<SolarStationInfo>, val location: UserLocation?)

/**
 * Stations for the Stations tab. With a location it asks the API for active stations
 * nearby (GET /stations/nearby); without one it lists every station (GET /stations).
 */
class StationsViewModel(
    private val api: StationApi = ApiClient.retrofit.create(StationApi::class.java)
) : ViewModel() {

    companion object {
        const val NEARBY_RADIUS_KM = 100
    }

    private val _state = MutableStateFlow<UiState<StationsData>>(UiState.Loading)
    val state: StateFlow<UiState<StationsData>> = _state.asStateFlow()

    var query: String = ""
    var location: UserLocation? = null
        private set

    private var job: Job? = null

    fun load(newLocation: UserLocation? = location) {
        location = newLocation
        _state.value = UiState.Loading
        job?.cancel()
        job = viewModelScope.launch {
            val at = newLocation
            val result = if (at != null) {
                safeApiCall { api.nearby(at.lat, at.lng, NEARBY_RADIUS_KM.toDouble()) }
            } else {
                safeApiCall { api.all() }
            }
            _state.value = when (result) {
                is ApiResult.Success -> UiState.Content(StationsData(result.data, at))
                is ApiResult.Failure -> UiState.Error(result.error)
            }
        }
    }

    fun loadIfNeeded() {
        if (_state.value !is UiState.Content) load()
    }
}
