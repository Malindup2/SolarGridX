package com.solargridx.mobile.reservations.booking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solargridx.mobile.common.ActionState
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.dto.CreateReservationRequest
import com.solargridx.mobile.dto.ReservationResponse
import com.solargridx.mobile.reservations.data.ReservationRepository
import com.solargridx.mobile.reservations.ui.BookingDraft
import com.solargridx.mobile.reservations.ui.Formatters
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class BookingConfirmViewModel(
    private val repository: ReservationRepository = ReservationRepository()
) : ViewModel() {

    private val _submit = MutableStateFlow<ActionState<ReservationResponse>>(ActionState.Idle)
    val submit: StateFlow<ActionState<ReservationResponse>> = _submit.asStateFlow()

    fun submit(nic: String, draft: BookingDraft) {
        val energy = draft.energyKwh ?: return
        // Ignore double taps while the request is in flight.
        if (_submit.value is ActionState.Running) return
        _submit.value = ActionState.Running
        viewModelScope.launch {
            val request = CreateReservationRequest(
                nic = nic,
                stationId = draft.stationId,
                slotId = draft.slotId,
                reservationDate = Formatters.dayKey(draft.slotDate),
                startTime = draft.startTime,
                endTime = draft.endTime,
                energyKwh = energy
            )
            _submit.value = when (val result = repository.create(request)) {
                is ApiResult.Success -> ActionState.Done(result.data)
                is ApiResult.Failure -> ActionState.Failed(result.error)
            }
        }
    }

    fun consume() {
        _submit.value = ActionState.Idle
    }
}
