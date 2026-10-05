package com.solargridx.mobile.reservations.bookings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.dto.ReservationResponse
import com.solargridx.mobile.reservations.data.ReservationRepository
import com.solargridx.mobile.reservations.ui.Formatters
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Upcoming = still live (Pending / Approved), soonest first. History = everything else, newest first. */
data class MyBookings(val upcoming: List<ReservationResponse>, val history: List<ReservationResponse>)

class MyBookingsViewModel(
    private val repository: ReservationRepository = ReservationRepository()
) : ViewModel() {

    private val _state = MutableStateFlow<UiState<MyBookings>>(UiState.Loading)
    val state: StateFlow<UiState<MyBookings>> = _state.asStateFlow()

    var selectedTab: Int = 0
    var query: String = ""

    /** NIC → name; only loaded for operators (prosumers only ever see their own bookings). */
    private val _names = MutableStateFlow<Map<String, String>>(emptyMap())
    val names: StateFlow<Map<String, String>> = _names.asStateFlow()

    fun loadNames() {
        viewModelScope.launch { _names.value = repository.prosumerNames() }
    }

    fun load() {
        if (_state.value !is UiState.Content) _state.value = UiState.Loading
        viewModelScope.launch {
            _state.value = when (val result = repository.myReservations()) {
                is ApiResult.Failure -> UiState.Error(result.error)
                is ApiResult.Success -> {
                    val (live, past) = result.data.partition { it.status == "Pending" || it.status == "Approved" }
                    UiState.Content(
                        MyBookings(
                            upcoming = live.sortedBy { Formatters.sortKey(it.reservationDate, it.startTime) },
                            history = past.sortedByDescending { Formatters.sortKey(it.reservationDate, it.startTime) }
                        )
                    )
                }
            }
        }
    }
}
