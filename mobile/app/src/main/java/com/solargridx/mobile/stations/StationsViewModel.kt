package com.solargridx.mobile.stations

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solargridx.mobile.api.ApiClient
import com.solargridx.mobile.api.StationApi
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.common.safeApiCall
import com.solargridx.mobile.dto.SolarStationInfo
import com.solargridx.mobile.reservations.data.SlotOpenings
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Where the user is, when they allowed location. */
data class UserLocation(val lat: Double, val lng: Double)

/** farAway: the user has a location but no station is within the radius, so every station is listed. */
data class StationsData(val stations: List<SolarStationInfo>, val location: UserLocation?, val farAway: Boolean = false)

/**
 * Stations for the Stations tab. With a location it asks the API for active stations
 * nearby (GET /stations/nearby, radius at most 50 km); without one, or when nothing is that
 * close, it lists every station (GET /stations), nearest first when it knows where the user is.
 * Stations with no slot open to book are left out, so none leads to an empty booking screen.
 */
class StationsViewModel(
    private val api: StationApi = ApiClient.retrofit.create(StationApi::class.java)
) : ViewModel() {

    companion object {
        // The API accepts a radius of 1 to 50 km.
        const val NEARBY_RADIUS_KM = 50
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
            var farAway = false
            var result = if (at != null) {
                safeApiCall { api.nearby(at.lat, at.lng, NEARBY_RADIUS_KM.toDouble()) }
            } else {
                safeApiCall { api.all() }
            }
            // Nothing within the radius (an emulator parked abroad, say): show every station instead of an empty screen.
            if (at != null && result is ApiResult.Success && result.data.isEmpty()) {
                farAway = true
                result = safeApiCall { api.all() }
            }
            _state.value = when (val done = result) {
                is ApiResult.Success -> UiState.Content(StationsData(SlotOpenings.withOpenSlots(done.data), at, farAway))
                is ApiResult.Failure -> UiState.Error(done.error)
            }
        }
    }

    fun loadIfNeeded() {
        if (_state.value !is UiState.Content) load()
    }
}
