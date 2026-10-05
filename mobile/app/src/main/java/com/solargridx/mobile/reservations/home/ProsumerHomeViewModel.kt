package com.solargridx.mobile.reservations.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.dto.ProsumerDashboardResponse
import com.solargridx.mobile.dto.ReservationResponse
import com.solargridx.mobile.reservations.data.ReservationRepository
import com.solargridx.mobile.reservations.ui.Formatters
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ProsumerHome(
    val dashboard: ProsumerDashboardResponse,
    val accountStatus: String?,
    val nextBooking: ReservationResponse?,
    /** Every booking, for the charts and recent list. */
    val reservations: List<ReservationResponse>
)

class ProsumerHomeViewModel(
    private val repository: ReservationRepository = ReservationRepository()
) : ViewModel() {

    private val _state = MutableStateFlow<UiState<ProsumerHome>>(UiState.Loading)
    val state: StateFlow<UiState<ProsumerHome>> = _state.asStateFlow()

    /** Refreshes quietly when content is already on screen (e.g. returning from a booking). */
    fun load(nic: String) {
        if (_state.value !is UiState.Content) _state.value = UiState.Loading
        viewModelScope.launch {
            val dashboard = async { repository.prosumerDashboard(nic) }
            val profile = async { repository.prosumer(nic) }
            val bookings = async { repository.myReservations() }

            when (val result = dashboard.await()) {
                is ApiResult.Failure -> _state.value = UiState.Error(result.error)
                is ApiResult.Success -> {
                    // Profile and bookings only decorate the home screen; their failure isn't fatal.
                    val status = (profile.await() as? ApiResult.Success)?.data?.status
                    val all = (bookings.await() as? ApiResult.Success)?.data.orEmpty()
                    val now = Formatters.nowKey()
                    val next = all
                        .filter { it.status == "Pending" || it.status == "Approved" }
                        .filter { Formatters.dayKey(it.reservationDate) + it.endTime > now }
                        .minByOrNull { Formatters.sortKey(it.reservationDate, it.startTime) }
                    _state.value = UiState.Content(ProsumerHome(result.data, status, next, all))
                }
            }
        }
    }
}
