package com.solargridx.mobile.reservations.details

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solargridx.mobile.common.ActionState
import com.solargridx.mobile.common.ApiResult
import com.solargridx.mobile.common.UiState
import com.solargridx.mobile.dto.ReservationResponse
import com.solargridx.mobile.reservations.SummaryAction
import com.solargridx.mobile.reservations.data.ReservationRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Result of an action: which summary to show and the server's response. */
data class ActionOutcome(val action: SummaryAction, val reservation: ReservationResponse)

/**
 * One reservation and the actions on it. Used by the prosumer's booking details
 * (update energy, cancel) and the operator's review (approve, reject). Which
 * buttons a screen shows is a convenience; the API decides and its error is shown.
 */
class ReservationDetailViewModel(
    private val repository: ReservationRepository = ReservationRepository()
) : ViewModel() {

    private val _state = MutableStateFlow<UiState<ReservationResponse>>(UiState.Loading)
    val state: StateFlow<UiState<ReservationResponse>> = _state.asStateFlow()

    private val _action = MutableStateFlow<ActionState<ActionOutcome>>(ActionState.Idle)
    val action: StateFlow<ActionState<ActionOutcome>> = _action.asStateFlow()

    private var reservationId: String? = null

    /** Prosumer's name for the operator review header (null until known / if unavailable). */
    private val _prosumerName = MutableStateFlow<String?>(null)
    val prosumerName: StateFlow<String?> = _prosumerName.asStateFlow()

    fun loadProsumerName(nic: String) {
        if (_prosumerName.value != null) return
        viewModelScope.launch { _prosumerName.value = repository.prosumerNames()[nic.uppercase()] }
    }

    fun load(id: String) {
        reservationId = id
        if (_state.value !is UiState.Content) _state.value = UiState.Loading
        viewModelScope.launch {
            _state.value = when (val result = repository.get(id)) {
                is ApiResult.Success -> UiState.Content(result.data)
                is ApiResult.Failure -> UiState.Error(result.error)
            }
        }
    }

    fun reload() = reservationId?.let { load(it) }

    fun updateEnergy(energyKwh: Double) {
        // Send the version this screen is showing, so a change made by someone else is not overwritten.
        val seen = (_state.value as? UiState.Content)?.data?.updatedAt
        run(SummaryAction.UPDATED) { repository.updateEnergy(it, energyKwh, seen) }
    }
    fun cancel() = run(SummaryAction.CANCELLED) { repository.cancel(it) }
    fun approve() = run(SummaryAction.APPROVED) { repository.approve(it) }
    fun reject(reason: String) = run(SummaryAction.REJECTED) { repository.reject(it, reason) }

    fun consumeAction() {
        _action.value = ActionState.Idle
    }

    private fun run(action: SummaryAction, call: suspend (String) -> ApiResult<ReservationResponse>) {
        val id = reservationId ?: return
        if (_action.value is ActionState.Running) return
        _action.value = ActionState.Running
        viewModelScope.launch {
            _action.value = when (val result = call(id)) {
                is ApiResult.Success -> ActionState.Done(ActionOutcome(action, result.data))
                is ApiResult.Failure -> {
                    // The reservation may have changed under us (e.g. 409 already decided): refresh it.
                    reload()
                    ActionState.Failed(result.error)
                }
            }
        }
    }
}
